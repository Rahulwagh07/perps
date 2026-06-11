import type {
  Balance,
  CreateOrderStreamMessage,
  Orderbook,
  OrderStreamMessage,
  Position,
} from '@repo/types'
import { createClient } from 'redis'
import { getLatestSnapshot, takeSnapshot } from './snapshot'
import { SNAPSHOT_INTERVAL } from './constant'
import { processOrder } from './orderbook'
import { configDotenv } from 'dotenv'
configDotenv()

console.log('redis url', process.env.REDIS_URL)

const redis = await createClient({ url: process.env.REDIS_URL })
  .on('error', err => console.log('redis error', err))
  .connect()

const orderbooks = new Map<string, Orderbook>()
const balances = new Map<string, Balance>()
const positions = new Map<string, Map<string, Position>>()

const ORDER_STREAM = 'orders:stream'
const GROUP_NAME = 'engine-group'
const CONSUMER_NAME = `engine-${process.pid}`

async function init() {
  try {
    await redis.xGroupCreate(ORDER_STREAM, GROUP_NAME, '0', {
      MKSTREAM: true,
    })
  } catch (err: any) {
    if (!err.message.includes('BUSYGROUP')) throw err
    console.log('consumer group already exists')
  }

  const snapshot = await getLatestSnapshot()

  if (snapshot) {
    console.log('restoring from snapshot...')

    for (const [marketId, rawOb] of Object.entries(snapshot.orderbooks)) {
      const ob: Orderbook = {
        bids: new Map(
          Object.entries(rawOb.bids).map(([price, level]: [string, any]) => [
            price,
            {
              availableQty: BigInt(level.availableQty),
              orders: level.orders.map((o: any) => ({
                ...o,
                qty: BigInt(o.qty),
                filledQty: BigInt(o.filledQty),
                initialMargin: BigInt(o.initialMargin),
              })),
            },
          ])
        ),
        asks: new Map(
          Object.entries(rawOb.asks).map(([price, level]: [string, any]) => [
            price,
            {
              availableQty: BigInt(level.availableQty),
              orders: level.orders.map((o: any) => ({
                ...o,
                qty: BigInt(o.qty),
                filledQty: BigInt(o.filledQty),
                initialMargin: BigInt(o.initialMargin),
              })),
            },
          ])
        ),
        lastTradedPrice: rawOb.lastTradedPrice,
        markPrice: rawOb.markPrice,
      }
      orderbooks.set(marketId, ob)
    }

    for (const [uid, bal] of Object.entries(snapshot.balances)) {
      balances.set(uid, bal as Balance)
    }

    for (const [uid, userPositions] of Object.entries(
      snapshot.positions ?? {}
    )) {
      positions.set(uid, new Map(Object.entries(userPositions as any)))
    }

    console.log('recovered from snapshot')
  }

  setInterval(
    () => takeSnapshot(orderbooks, balances, positions),
    SNAPSHOT_INTERVAL
  )

  await recoverPendingMessages()
  await processLoop()
}

async function recoverPendingMessages() {
  const result = await redis.xAutoClaim(
    ORDER_STREAM,
    GROUP_NAME,
    CONSUMER_NAME,
    0,
    '0-0'
  )

  console.log(`recovering  pending messages`)

  for (const msg of result.messages) {
    await handleMessage(msg.id, msg?.message as Record<string, string>)
  }
}

async function processLoop() {
  console.log('processing orders')

  while (true) {
    const streams = await redis.xReadGroup(
      GROUP_NAME,
      CONSUMER_NAME,
      [{ key: ORDER_STREAM, id: '>' }],
      { COUNT: 1, BLOCK: 0 }
    )

    if (!streams || streams.length === 0) continue

    for (const stream of streams) {
      for (const msg of stream.messages) {
        await handleMessage(msg.id, msg.message as Record<string, string>)
      }
    }
  }
}

async function handleMessage(
  messageId: string,
  fields: Record<string, string>
) {
  const msgType = fields.msgType as OrderStreamMessage['msgType']

  if (msgType === 'CREATE_ORDER') {
    const msg = fields as CreateOrderStreamMessage
    const result = processOrder(msg, orderbooks, balances, positions)

    const responseKey = `response:${msg.queueId}:${msg.identifier}`

    if (!result.success) {
      await redis.xAdd(responseKey, '*', {
        identifier: msg.identifier,
        orderId: msg.orderId,
        filledQty: '0',
        status: 'CANCELLED',
        error: result.reason,
      })
      await redis.xAck(ORDER_STREAM, GROUP_NAME, messageId)
      return
    }

    // send response back to backend which send this request
    await redis.xAdd(responseKey, '*', {
      identifier: msg.identifier,
      orderId: msg.orderId,
      filledQty: result.filledQty.toString(),
      status: result.status,
    })
    await redis.expire(responseKey, 30)
    await redis.xAck(ORDER_STREAM, GROUP_NAME, messageId)
  } else if (msgType === 'CANCEL_ORDER') {
  }
}

await init()
