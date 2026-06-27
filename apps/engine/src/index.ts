import type {
  Balance,
  CancelOrderStreamMessage,
  CreateOrderStreamMessage,
  DepositStreamMessage,
  DepthUpdate,
  MarkPriceUpdateMessage,
  Orderbook,
  OrderStreamMessage,
  Position,
} from '@repo/types'
import { createClient } from 'redis'
import { getLatestSnapshot, takeSnapshot } from './snapshot'
import { FUNDING_INTERVAL_MS, SNAPSHOT_INTERVAL } from './constant'
import { cancelOrder, processOrder, type OrderIndexEntry } from './orderbook'
import { configDotenv } from 'dotenv'
import {
  buildLiquidationOrder,
  calculateLiquidationResult,
  findLiquidatablePositions,
} from './liquidation'
import { runADL } from './adl'
import { calculateFundingRate, settleFunding } from './funding'
configDotenv()

console.log('redis url', process.env.REDIS_URL)

const redis = await createClient({ url: process.env.REDIS_URL })
  .on('error', err => console.log('redis error', err))
  .connect()

const orderbooks = new Map<string, Orderbook>()
const balances = new Map<string, Balance>()
const positions = new Map<string, Map<string, Position>>()
//to find and order without scanning every price level
const orderIndex = new Map<string, OrderIndexEntry>()
let totalFeesCollected = 0n
let insuranceFund = 0n
let lastFundingTimes = new Map<string, number>() //marketId -> last settelment time

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
        indexPrice: rawOb.indexPrice ?? 0,
      }
      orderbooks.set(marketId, ob)

      //re-build orderindex
      for (const [price, level] of ob.bids) {
        for (const order of level.orders) {
          orderIndex.set(order.orderId, {
            marketId,
            side: 'BID',
            price,
          })
        }
      }
      for (const [price, level] of ob.asks) {
        for (const order of level.orders) {
          orderIndex.set(order.orderId, {
            marketId,
            side: 'ASK',
            price,
          })
        }
      }
    }

    for (const [uid, bal] of Object.entries(snapshot.balances)) {
      balances.set(uid, bal as Balance)
    }

    for (const [uid, userPositions] of Object.entries(
      snapshot.positions ?? {}
    )) {
      positions.set(uid, new Map(Object.entries(userPositions as any)))
    }

    if (snapshot.totalFeesCollected) {
      totalFeesCollected = BigInt(snapshot.totalFeesCollected)
    }

    if (snapshot.insuranceFund) {
      insuranceFund = BigInt(snapshot.insuranceFund)
    }

    if (snapshot.lastFundingTimes) {
      lastFundingTimes = new Map(Object.entries(snapshot.lastFundingTimes))
    }

    console.log('recovered from snapshot')
  }

  for (const marketId of orderbooks.keys()) {
    await publishDepth(marketId)
  }

  setInterval(
    () =>
      takeSnapshot(
        orderbooks,
        balances,
        positions,
        totalFeesCollected,
        insuranceFund,
        lastFundingTimes
      ),
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
    if (!msg) continue
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
    await handleCreateOrder(messageId, fields)
  } else if (msgType === 'CANCEL_ORDER') {
    await handleCancelOrder(messageId, fields)
  } else if (msgType === 'DEPOSIT') {
    await handleDeposit(messageId, fields)
  } else if (msgType === 'MARK_PRICE_UPDATE') {
    await handleMarkPriceUpdate(messageId, fields)
  }
}

async function handleCreateOrder(
  messageId: string,
  fields: Record<string, string>
) {
  const msg = fields as unknown as CreateOrderStreamMessage
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
  totalFeesCollected += result.totalFeesCollected
  insuranceFund += result.insuranceContribution

  //maintain order index
  if (result.addedToBook) {
    orderIndex.set(msg.orderId, {
      marketId: msg.marketId,
      side: msg.side,
      price: msg.price,
    })
  }

  for (const filledOrderId of result.fullyFilledMakerORderIds) {
    orderIndex.delete(filledOrderId)
  }

  // send response back to backend which send this request
  await redis.xAdd(responseKey, '*', {
    identifier: msg.identifier,
    orderId: msg.orderId,
    filledQty: result.filledQty.toString(),
    status: result.status,
  })
  await redis.expire(responseKey, 30)
  console.log('fills', result.fills)
  if (result.fills.length > 0) {
    await redis.xAdd('fills:stream', '*', {
      orderId: msg.orderId,
      userId: msg.userId,
      marketId: msg.marketId,
      filledQty: result.filledQty.toString(),
      status: result.status,
      fills: JSON.stringify(result.fills),
      makerOrderUpdates: JSON.stringify(result.makerOrderUpdates),
    })
  }
  //publish balance update for all affected users
  const effectedUsers = new Set([
    msg.userId,
    ...result.fills.map(f => f.makerId),
  ])
  for (const uid of effectedUsers) {
    await publishBalance(uid)
    await publishPositions(uid)
  }
  await publishDepth(msg.marketId)
  await redis.xAck(ORDER_STREAM, GROUP_NAME, messageId)
}

async function handleCancelOrder(
  messageId: string,
  fields: Record<string, string>
) {
  const msg = fields as CancelOrderStreamMessage
  const responseKey = `response:${msg.queueId}:${msg.identifier}`

  const result = cancelOrder(
    msg.orderId,
    msg.userId,
    orderIndex,
    orderbooks,
    balances
  )

  if (!result.success) {
    await redis.xAdd(responseKey, '*', {
      identifier: msg.identifier,
      error: result.reason,
    })
    await redis.xAck(ORDER_STREAM, GROUP_NAME, messageId)
    return
  }

  await redis.xAdd('fills:stream', '*', {
    orderId: msg.orderId,
    userId: msg.userId,
    filledQty: '0',
    status: 'CANCELLED',
    fills: JSON.stringify([]),
  })

  await publishBalance(msg.userId)

  await redis.xAdd(responseKey, '*', {
    identifier: msg.identifier,
    orderId: msg.orderId,
    marginReturned: result.marginReturned.toString(),
  })
}

async function handleDeposit(
  messageId: string,
  fields: Record<string, string>
) {
  const msg = fields as DepositStreamMessage
  const amount = BigInt(msg.amount)

  const existing = balances.get(msg.userId) ?? { available: '0', locked: '0' }
  existing.available = (BigInt(existing.available) + amount).toString()
  balances.set(msg.userId, existing)

  await publishBalance(msg.userId)

  const responseKey = `response:${msg.queueId}:${msg.identifier}`

  await redis.xAdd(responseKey, '*', {
    identified: msg.identifier,
    available: existing.available,
    locked: existing.locked,
  })

  await redis.xAck(ORDER_STREAM, GROUP_NAME, messageId)
}

async function handleMarkPriceUpdate(
  messageId: string,
  fields: Record<string, string>
) {
  const msg = fields as MarkPriceUpdateMessage
  let ob = orderbooks.get(msg.marketId)

  if (!ob) {
    ob = {
      bids: new Map(),
      asks: new Map(),
      lastTradedPrice: 0,
      markPrice: 0,
      indexPrice: 0,
    }
    orderbooks.set(msg.marketId, ob)
  }

  const now = Date.now()
  const lastFunding = lastFundingTimes.get(msg.marketId) ?? 0

  if (now - lastFunding >= FUNDING_INTERVAL_MS) {
    const fundingRate = calculateFundingRate(ob.markPrice, ob.indexPrice)
    const fundingResult = settleFunding(
      msg.marketId,
      fundingRate,
      BigInt(Math.round(ob.markPrice)),
      positions,
      balances
    )

    //publish funding payments
    if (fundingResult.payments.length > 0) {
      await redis.xAdd('funding:stream', '*', {
        marketId: msg.marketId,
        fundingRate: fundingRate.toString(),
        payments: JSON.stringify(
          fundingResult.payments.map(p => ({
            ...p,
            amount: p.amount.toString(),
          }))
        ),
        timestamp: now.toString(),
      })
    }

    lastFundingTimes.set(msg.marketId, now)

    console.log(`FUNDING: market:${msg.marketId}, rate: ${fundingRate}`)
  }

  if (fields.markPrice && fields.indexPrice) {
    ob.markPrice = parseFloat(fields.markPrice)
    ob.indexPrice = parseFloat(fields.indexPrice)

    //check liquidation
    const liquidatable = findLiquidatablePositions(
      msg.marketId,
      BigInt(Math.round(ob.markPrice)),
      positions
    )

    for (const liq of liquidatable) {
      const pos = { ...liq.position }
      const liqOrder = buildLiquidationOrder(
        liq.userId,
        msg.marketId,
        liq.position,
        Math.round(ob.markPrice).toString()
      )
      const result = processOrder(liqOrder, orderbooks, balances, positions)

      if (result.success && result.fills.length > 0) {
        const avgFillPrice = BigInt(result.fills[0]!.price)
        const liqResult = calculateLiquidationResult(
          pos,
          avgFillPrice,
          BigInt(pos.qty)
        )

        //surplus -> insurance fund
        insuranceFund += liqResult.surplus

        //deficit
        //1)insurance fund
        //2)ADL
        if (liqResult.deficit > 0n) {
          if (insuranceFund >= liqResult.deficit) {
            insuranceFund -= liqResult.deficit
          } else {
            //trigger ADL
            const uncoverdDeficit = liqResult.deficit - insuranceFund
            insuranceFund = 0n
            runADL(
              msg.marketId,
              pos.side,
              uncoverdDeficit,
              ob.markPrice.toString(),
              positions,
              balances
            )
          }
        }
        await redis.xAdd(`fills:stream`, '*', {
          userId: liq.userId,
          marketId: msg.marketId,
          side: pos.side,
          qty: pos.qty,
          entryPrice: pos.averagePrice,
          markPrice: ob.markPrice.toString(),
          equity: pos.equity,
          surplus: liqResult.surplus.toString(),
          deficit: liqResult.deficit.toString(),
        })
        await publishBalance(liq.userId)
        await publishPositions(liq.userId)
      }
    }
  }

  await publishDepth(msg.marketId)
  await redis.xAck(ORDER_STREAM, GROUP_NAME, messageId)
}

async function publishBalance(userId: string) {
  const bal = balances.get(userId)
  if (!bal) return
  await redis.hSet(`balance:${userId}`, {
    available: bal.available,
    locked: bal.locked,
  })
}

async function publishPositions(userId: string) {
  const userPositions = positions.get(userId)
  if (!userPositions) return

  const posArray = Array.from(userPositions.entries()).map(
    ([marketId, pos]) => ({
      marketId,
      side: pos.side,
      qty: pos.qty.toString(),
      averagePrice: pos.averagePrice.toString(),
      equity: pos.equity.toString(),
      liquidationPrice: pos.liquidationPrice.toString(),
      unrealizedPnl: pos.unrealizedPnl.toString(),
    })
  )

  await redis.set(`positions:${userId}`, JSON.stringify(posArray))
}

async function publishDepth(marketId: string) {
  const ob = orderbooks.get(marketId)
  if (!ob) return
  const depth: DepthUpdate = {
    marketId,
    bids: [...ob.bids.entries()]
      .map(([p, l]) => [p, l.availableQty.toString()] as [string, string])
      .sort((a, b) => Number(BigInt(b[0]) - BigInt(a[0]))),
    asks: [...ob.asks.entries()]
      .map(([p, l]) => [p, l.availableQty.toString()] as [string, string])
      .sort((a, b) => Number(BigInt(a[0]) - BigInt(b[0]))),

    lastTradedPrice: ob.lastTradedPrice,
    markPrice: ob.markPrice,
    indexPrice: ob.indexPrice,
  }

  //cache for backend reads
  await redis.set(`depth:cache:${marketId}`, JSON.stringify(depth))
  await redis.publish(`depth:${marketId}`, JSON.stringify(depth))
}
await init()
