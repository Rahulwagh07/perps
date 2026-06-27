import { WebSocketServer, WebSocket } from 'ws'
import { createClient } from 'redis'
import { configDotenv } from 'dotenv'
import type { DepthUpdate } from '@repo/types'
import type { ClientMessage } from './types'
configDotenv()

const PORT = Number(process.env.PORT) ?? 8080

const subscriber = createClient({ url: process.env.REDIS_URL })
subscriber.on('error', err => console.error('Redis subscriber error', err))
await subscriber.connect()

const redisClient = createClient({ url: process.env.REDIS_URL })
redisClient.on('error', err => console.error('Redis client error', err))
await redisClient.connect()

console.log('Redis connected')

// channelId => set of connected websocket clients
const subscriptions = new Map<string, Set<WebSocket>>()

// reverse lookup: ws => set of channelIds
const clientSubs = new Map<WebSocket, Set<string>>()
const wss = new WebSocketServer({ port: PORT })

wss.on('connection', (ws: WebSocket) => {
  clientSubs.set(ws, new Set())

  ws.on('message', (raw: Buffer) => {
    try {
      const msg = JSON.parse(raw.toString())
      handleClientMessage(ws, msg)
    } catch {
      ws.send(JSON.stringify({ error: 'invalid message' }))
    }
  })

  ws.on('close', () => cleanup(ws))
  ws.on('error', () => cleanup(ws))
})

console.log(`WS server listening on port ${PORT}`)

function handleClientMessage(ws: WebSocket, msg: ClientMessage) {
  if (!msg.method || !Array.isArray(msg.params)) {
    ws.send(JSON.stringify({ error: 'invalid message format' }))
    return
  }

  for (const param of msg.params) {
    const parts = param.split('.')
    console.log('parts', parts)
    if (parts.length < 2) continue
    const stream = parts[0]
    const marketId = parts.slice(1).join('.')

    if (stream !== 'depth' && stream !== 'user') {
      ws.send(JSON.stringify({ error: `unknown stream: ${stream}` }))
      continue
    }

    const channelId = stream === 'depth' ? marketId : parts.slice(1).join('.'); // marketId or userId
    
    if (msg.method === 'SUBSCRIBE') {
      subscribe(ws, stream + '.' + channelId)
    } else if (msg.method === 'UNSUBSCRIBE') {
      unsubscribe(ws, stream + '.' + channelId)
    }
  }

  ws.send(
    JSON.stringify({
      result: msg.method === 'SUBSCRIBE' ? 'subscribed' : 'unsubscribed',
      params: msg.params,
    })
  )
}

async function subscribe(ws: WebSocket, channelId: string) {
  let subs = subscriptions.get(channelId)
  if (!subs) {
    subs = new Set()
    subscriptions.set(channelId, subs)
  }
  subs.add(ws)
  const channels = clientSubs.get(ws)
  channels?.add(channelId)

  if (channelId.startsWith('depth.')) {
    const marketId = channelId.slice('depth.'.length)
    const cachedDepth = await redisClient.get(`depth:cache:${marketId}`)
    if (cachedDepth && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        stream: 'depth',
        data: JSON.parse(cachedDepth)
      }))
    }
  }
}

function unsubscribe(ws: WebSocket, marketId: string) {
  const subs = subscriptions.get(marketId)
  if (subs) {
    subs.delete(ws)
    if (subs.size === 0) subscriptions.delete(marketId)
  }
  const markets = clientSubs.get(ws)
  markets?.delete(marketId)
}

function cleanup(ws: WebSocket) {
  const markets = clientSubs.get(ws)
  if (markets) {
    for (const marketId of markets) {
      const subs = subscriptions.get(marketId)
      if (subs) {
        subs.delete(ws)
        if (subs.size === 0) subscriptions.delete(marketId)
      }
    }
  }
  clientSubs.delete(ws)
}

await subscriber.pSubscribe('depth:*', (message, channel) => {
  // channel is "depth:{marketId}"
  const marketId = channel.slice('depth:'.length)
  const subs = subscriptions.get(`depth.${marketId}`)

  if (!subs || subs.size === 0) return

  const payload = JSON.stringify({
    stream: 'depth',
    data: JSON.parse(message) as DepthUpdate,
  })

  for (const ws of subs) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload)
    }
  }
})

await subscriber.pSubscribe('user:*', (message, channel) => {
  // channel is "user:{userId}"
  const userId = channel.slice('user:'.length)
  const subs = subscriptions.get(`user.${userId}`)

  if (!subs || subs.size === 0) return

  const payload = JSON.stringify({
    stream: 'user',
    data: JSON.parse(message),
  })

  for (const ws of subs) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload)
    }
  }
})

console.log('subscribed to depth:* and user:* pub/sub channels')
