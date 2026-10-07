import { prisma } from '@repo/db'
import type { MarketMapping, RedisClient } from './types'
import WebSocket from 'ws'
import { buildStreamUrl, slugToBinanceSymbol } from './utils'

const ORDER_STREAM = 'orders:stream'
const RETRY_MS = 5000
const MIN_MARK_PRICE_INTERVAL_MS = 600000
const IMMEDIATE_MOVE_BPS = 100

const lastSent = new Map<string, { markPrice: string; indexPrice: string; at: number }>()

function shouldForward(marketId: string, markPrice: string, indexPrice: string): boolean {
  const prev = lastSent.get(marketId)
  if (!prev) return true
  if (markPrice === prev.markPrice && indexPrice === prev.indexPrice) return false
  if (Date.now() - prev.at < MIN_MARK_PRICE_INTERVAL_MS) {
    const cur = Number(markPrice)
    const old = Number(prev.markPrice)
    if (!Number.isFinite(cur) || !Number.isFinite(old) || old === 0) return false
    return Math.abs((cur - old) / old) * 10000 >= IMMEDIATE_MOVE_BPS
  }
  return true
}

let markets: MarketMapping[] = []
let symbolToMarketId = new Map<string, string>()
let ws: WebSocket | null = null
let redis: RedisClient

async function fetchMarkets(): Promise<MarketMapping[]> {
  const dbMarkets = await prisma.market.findMany()
  return dbMarkets.map(m => ({
    marketId: m.id,
    slug: m.slug,
    binanceSymbol: slugToBinanceSymbol(m.slug),
  }))
}

async function refreshMarkets() {
  try {
    const newMarkets = await fetchMarkets()

    // check if markets changed
    const currentSymbols = new Set(markets.map(m => m.binanceSymbol))
    const newSymbols = new Set(newMarkets.map(m => m.binanceSymbol))

    let changed = currentSymbols.size !== newSymbols.size
    if (!changed) {
      for (const sym of newSymbols) {
        if (!currentSymbols.has(sym)) {
          changed = true
          break
        }
      }
    }

    if (changed) {
      markets = newMarkets
      symbolToMarketId = new Map(
        markets.map(m => [m.binanceSymbol.toUpperCase(), m.marketId])
      )

      if (markets.length === 0) {
        console.log('no markets found')
      } else {
        console.log(
          `tracking ${markets.length} markets:`,
          markets.map(m => `${m.slug} → ${m.binanceSymbol}`)
        )
      }

      //if already connected, reconnect with new markets
      if (ws) {
        console.log('markets changed, reconnecting ws.......')
        ws.close()
      } else {
        connect()
      }
    }
  } catch (err) {
    console.error('failed to fetch markets', err)
  }
}

function connect() {
  if (markets.length === 0) {
    console.log('no markets')
    return
  }
  const url = buildStreamUrl(markets)
  console.log(`connecting to binance: ${url}`)

  ws = new WebSocket(url)

  ws.on('open', () => {
    console.log('connected to binance mark price stream')
  })

  ws.on('message', async (raw: Buffer) => {
    try {
      const envelope = JSON.parse(raw.toString())
      //stream format: { stream: "solusdt@markPrice@1s", data: {...} }
      const data = envelope.data
      if (!data || !data.s) return
      const marketId = symbolToMarketId.get(data.s)
      if (!marketId) return
      const markPrice = data.p
      const indexPrice = data.i

      if (!markPrice) return
      if (!shouldForward(marketId, markPrice, indexPrice)) return
      lastSent.set(marketId, { markPrice, indexPrice, at: Date.now() })

      console.log('markprice', markPrice, 'indexPrice', indexPrice)

      const res = await redis.xAdd(ORDER_STREAM, '*', {
        msgType: 'MARK_PRICE_UPDATE',
        marketId,
        markPrice,
        indexPrice,
      })
      console.log('xAdd result:', res)
    } catch (err) {
      console.error('error processing message:', err)
    }
  })

  ws.on('close', (code: number, reason: Buffer) => {
    console.log(`disconnected ws (code=${code}, reason=${reason.toString()})`)
    scheduleReconnect()
  })

  ws.on('error', (err: Error) => {
    console.log('ws error:', err.message)
  })
}

function scheduleReconnect() {
  ws = null
  console.log(`reconnecting in ${RETRY_MS}ms`)
  setTimeout(() => connect(), RETRY_MS)
}

// connects to binance  mark price WS stream and pushes
// MARK_PRICE_UPDATE messages into orders:stream for the engine
export async function startMarkPriceService(redisClient: RedisClient) {
  redis = redisClient
  await refreshMarkets()
}
