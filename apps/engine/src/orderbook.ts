import type {
  Orderbook,
  PriceLevel,
  Fill,
  Balance,
  Position,
  CreateOrderStreamMessage,
  MakerOrderUpdate,
} from '@repo/types'
import { TAKER_FEE_BPS, INSURANCE_FEE_RATIO_BPS, BPS_DIVISOR } from './constant'
import { calculatedEstimatedFees, deductFees } from './utils'

export type OrderMatchResult =
  | { success: false; reason: string }
  | {
    success: true
    filledQty: bigint
    status: 'FILLED' | 'PARTIALLY_FILLED' | 'OPEN'
    fills: Fill[]
    fullyFilledMakerORderIds: string[]
    addedToBook: boolean
    makerOrderUpdates: MakerOrderUpdate[]
    totalFeesCollected: bigint
    insuranceContribution: bigint
  }

export type CancelResult =
  | { success: false; reason: string }
  | { success: true; marginReturned: bigint }

function calculateLiquidationPrice(
  averagePrice: bigint,
  equity: bigint,
  qty: bigint,
  side: 'long' | 'short'
): bigint {
  const equityPerUnit = equity / qty
  return side === 'long'
    ? averagePrice - equityPerUnit
    : averagePrice + equityPerUnit
}

function updatePosition(
  positions: Map<string, Map<string, Position>>,
  balances: Map<string, Balance>,
  userId: string,
  marketId: string,
  side: 'long' | 'short',
  fillQty: bigint,
  fillPrice: bigint,
  equityForFill: bigint // the margin amount for this fill
) {
  if (!positions.has(userId)) {
    positions.set(userId, new Map())
  }
  const userPositions = positions.get(userId)!
  const existing = userPositions.get(marketId)

  if (!existing) {
    //new position
    const liqPrice = calculateLiquidationPrice(
      fillPrice,
      equityForFill,
      fillQty,
      side
    )

    userPositions.set(marketId, {
      side,
      qty: fillQty.toString(),
      averagePrice: fillPrice.toString(),
      equity: equityForFill.toString(),
      liquidationPrice: liqPrice.toString(),
      unrealizedPnl: '0',
    })
    return
  }

  const existingQty = BigInt(existing.qty)
  const existingAvgPrice = BigInt(existing.averagePrice)
  const existingEquity = BigInt(existing.equity)

  //same side
  if (existing.side === side) {
    const newQty = existingQty + fillQty
    const newAvgPrice =
      (existingAvgPrice * existingQty + fillPrice * fillQty) / newQty
    const newEquity = existingEquity + equityForFill
    const liqPrice = calculateLiquidationPrice(
      newAvgPrice,
      newEquity,
      newQty,
      side
    )

    userPositions.set(marketId, {
      side,
      qty: newQty.toString(),
      averagePrice: newAvgPrice.toString(),
      equity: newEquity.toString(),
      liquidationPrice: liqPrice.toString(),
      unrealizedPnl: '0',
    })
  }
  //opposite side: reduce, close or flip
  else {
    if (fillQty < existingQty) {
      //partial close
      const equityReturned = (fillQty * existingEquity) / existingQty
      const remainingQty = existingQty - fillQty
      const remainingEquity = existingEquity - equityReturned

      // return the closed portion of equity
      const bal = balances.get(userId)!
      bal.available = (BigInt(bal.available) + equityReturned).toString()
      bal.locked = (BigInt(bal.locked) - equityReturned).toString()

      const liqPrice = calculateLiquidationPrice(
        existingAvgPrice,
        remainingEquity,
        remainingQty,
        existing.side as 'long' | 'short'
      )

      userPositions.set(marketId, {
        ...existing,
        qty: remainingQty.toString(),
        equity: remainingEquity.toString(),
        liquidationPrice: liqPrice.toString(),
        unrealizedPnl: '0',
      })
    } else if (fillQty === existingQty) {
      //full close- return all equity
      const bal = balances.get(userId)!
      bal.available = (BigInt(bal.available) + existingEquity).toString()
      bal.locked = (BigInt(bal.locked) - existingEquity).toString()

      userPositions.delete(marketId)
    } else {
      //flip
      const equityForClose = (existingQty * equityForFill) / fillQty
      const flipQty = fillQty - existingQty
      const equityForFlip = equityForFill - equityForClose
      const bal = balances.get(userId)!
      bal.available = (BigInt(bal.available) + existingEquity).toString()
      bal.locked = (BigInt(bal.locked) - existingEquity).toString()

      //open new position in the opposite side
      const liqPrice = calculateLiquidationPrice(
        fillPrice,
        equityForFlip,
        flipQty,
        side
      )

      userPositions.set(marketId, {
        side,
        qty: flipQty.toString(),
        averagePrice: fillPrice.toString(),
        equity: equityForFlip.toString(),
        liquidationPrice: liqPrice.toString(),
        unrealizedPnl: '0',
      })
    }
  }
}

export function processOrder(
  msg: CreateOrderStreamMessage,
  orderbooks: Map<string, Orderbook>,
  balances: Map<string, Balance>,
  positions: Map<string, Map<string, Position>>
): OrderMatchResult {
  if (msg.qty) msg.qty = Math.round(Number(msg.qty)).toString()
  if (msg.price) msg.price = Math.round(Number(msg.price)).toString()
  if (msg.initialMargin) msg.initialMargin = Math.round(Number(msg.initialMargin)).toString()


  const balance = balances.get(msg.userId)
  if (!balance) {
    return { success: false, reason: 'User balance not found' }
  }

  const available = BigInt(balance.available)
  const margin = BigInt(msg.initialMargin)
  const makerOrderUpdates: MakerOrderUpdate[] = []
  let totalFeesCollected = 0n

  if (!msg.isLiquidation) {
    const estimatedFee = calculatedEstimatedFees(
      BigInt(msg.qty),
      BigInt(msg.price),
      TAKER_FEE_BPS
    )

    if (available < margin + estimatedFee) {
      return {
        success: false,
        reason: `insufficient balance`,
      }
    }
    balance.available = (available - margin).toString()
    balance.locked = (BigInt(balance.locked) + margin).toString()
  }

  if (!orderbooks.has(msg.marketId)) {
    orderbooks.set(msg.marketId, {
      bids: new Map(),
      asks: new Map(),
      lastTradedPrice: 0,
      markPrice: 0,
      indexPrice: 0,
    })
  }

  const ob = orderbooks.get(msg.marketId)!
  const fills: Fill[] = []
  let remainingQty = BigInt(msg.qty)
  const incomingPrice = BigInt(msg.price)
  const fullyFilledMakerORderIds: string[] = []

  //buy orders
  if (msg.side === 'BID') {
    const sortedAskPrices = [...ob.asks.keys()]
      .map(BigInt)
      .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))

    for (const askPrice of sortedAskPrices) {
      if (remainingQty === 0n) break
      if (msg.type === 'LIMIT' && askPrice > incomingPrice) break

      const level = ob.asks.get(askPrice.toString())!

      for (const askOrder of level.orders) {
        if (remainingQty === 0n) break

        const askAvailable = askOrder.qty - askOrder.filledQty
        const fillQty =
          remainingQty < askAvailable ? remainingQty : askAvailable

        const {
          takerFee,
          makerFee,
          total: feesCollected,
        } = deductFees(
          fillQty,
          askPrice,
          balance,
          balances.get(askOrder.userId)!
        )
        totalFeesCollected += feesCollected

        fills.push({
          makerId: askOrder.userId,
          takerId: msg.userId,
          qty: fillQty.toString(),
          price: askPrice.toString(),
          makerOrderId: askOrder.orderId,
          takerOrderId: msg.orderId,
          marketId: msg.marketId,
          takerFee: takerFee.toString(),
          makerFee: makerFee.toString(),
        })

        //taker position update
        // taker is buying : long position
        //equity for this fill ->  proportional slice of their total margin
        const takerEquityForFill = (margin * fillQty) / BigInt(msg.qty)

        updatePosition(
          positions,
          balances,
          msg.userId,
          msg.marketId,
          'long',
          fillQty,
          askPrice,
          takerEquityForFill
        )

        //maker position update
        // maker was selling.. short position
        // their equity for this fill -> proportional slice of there order margin
        //initialMargin is the total margin locked for order
        const makerEquityForFill =
          (askOrder.initialMargin * fillQty) / askOrder.qty

        updatePosition(
          positions,
          balances,
          askOrder.userId,
          msg.marketId,
          'short',
          fillQty,
          askPrice,
          makerEquityForFill
        )

        //update order states
        askOrder.filledQty += fillQty
        level.availableQty -= fillQty
        remainingQty -= fillQty
        ob.lastTradedPrice = Number(askPrice)
        if (askOrder.filledQty === askOrder.qty) {
          fullyFilledMakerORderIds.push(askOrder.orderId)

          makerOrderUpdates.push({
            orderId: askOrder.orderId,
            filledQty: askOrder.filledQty.toString(),
            status: 'FILLED',
          })
        } else {
          makerOrderUpdates.push({
            orderId: askOrder.orderId,
            filledQty: askOrder.filledQty.toString(),
            status: 'PARTIALLY_FILLED',
          })
        }
      }

      level.orders = level.orders.filter(o => o.filledQty < o.qty)
      if (level.availableQty === 0n) ob.asks.delete(askPrice.toString())
    }

    //rest unfilled portion on the book
    if (remainingQty > 0n && msg.type === 'LIMIT') {
      const existing: PriceLevel = ob.bids.get(msg.price) ?? {
        availableQty: 0n,
        orders: [],
      }
      existing.availableQty += remainingQty
      existing.orders.push({
        userId: msg.userId,
        orderId: msg.orderId,
        qty: BigInt(msg.qty),
        filledQty: BigInt(msg.qty) - remainingQty,
        initialMargin: margin,
        createdAt: new Date(),
      })
      ob.bids.set(msg.price, existing)
    } else if (remainingQty > 0n && msg.type === 'MARKET') {
      //market order not fully filled return the unfilled unfilled portion margin
      const equityToReturn = (margin * remainingQty) / BigInt(msg.qty)
      balance.available = (
        BigInt(balance.available) + equityToReturn
      ).toString()
      balance.locked = (BigInt(balance.locked) - equityToReturn).toString()
    }
  }

  //sell order
  else {
    const sortedBidPrices = [...ob.bids.keys()]
      .map(BigInt)
      .sort((a, b) => (a > b ? -1 : a < b ? 1 : 0))

    for (const bidPrice of sortedBidPrices) {
      if (remainingQty === 0n) break
      if (msg.type === 'LIMIT' && bidPrice < incomingPrice) break

      const level = ob.bids.get(bidPrice.toString())!

      for (const bidOrder of level.orders) {
        if (remainingQty === 0n) break

        const bidAvailable = bidOrder.qty - bidOrder.filledQty
        const fillQty =
          remainingQty < bidAvailable ? remainingQty : bidAvailable

        const {
          takerFee,
          makerFee,
          total: feesCollected,
        } = deductFees(
          fillQty,
          bidPrice,
          balance,
          balances.get(bidOrder.userId)!
        )
        totalFeesCollected += feesCollected

        fills.push({
          makerId: bidOrder.userId,
          takerId: msg.userId,
          qty: fillQty.toString(),
          price: bidPrice.toString(),
          makerOrderId: bidOrder.orderId,
          takerOrderId: msg.orderId,
          marketId: msg.marketId,
          takerFee: takerFee.toString(),
          makerFee: makerFee.toString(),
        })

        // taker is selling (short)
        const takerEquityForFill = (margin * fillQty) / BigInt(msg.qty)

        updatePosition(
          positions,
          balances,
          msg.userId,
          msg.marketId,
          'short',
          fillQty,
          bidPrice,
          takerEquityForFill
        )

        //maker was buying (long)
        const makerEquityForFill =
          (bidOrder.initialMargin * fillQty) / bidOrder.qty

        updatePosition(
          positions,
          balances,
          bidOrder.userId,
          msg.marketId,
          'long',
          fillQty,
          bidPrice,
          makerEquityForFill
        )

        bidOrder.filledQty += fillQty
        level.availableQty -= fillQty
        remainingQty -= fillQty
        ob.lastTradedPrice = Number(bidPrice)

        if (bidOrder.filledQty === bidOrder.qty) {
          fullyFilledMakerORderIds.push(bidOrder.orderId)
          makerOrderUpdates.push({
            orderId: bidOrder.orderId,
            filledQty: bidOrder.filledQty.toString(),
            status: 'FILLED',
          })
        } else {
          makerOrderUpdates.push({
            orderId: bidOrder.orderId,
            filledQty: bidOrder.filledQty.toString(),
            status: 'PARTIALLY_FILLED',
          })
        }
      }

      level.orders = level.orders.filter(o => o.filledQty < o.qty)
      if (level.availableQty === 0n) ob.bids.delete(bidPrice.toString())
    }

    if (remainingQty > 0n && msg.type === 'LIMIT') {
      const existing: PriceLevel = ob.asks.get(msg.price) ?? {
        availableQty: 0n,
        orders: [],
      }
      existing.availableQty += remainingQty
      existing.orders.push({
        userId: msg.userId,
        orderId: msg.orderId,
        qty: BigInt(msg.qty),
        filledQty: BigInt(msg.qty) - remainingQty,
        initialMargin: margin,
        createdAt: new Date(),
      })
      ob.asks.set(msg.price, existing)
    } else if (remainingQty > 0n && msg.type === 'MARKET') {
      const equityToReturn = (margin * remainingQty) / BigInt(msg.qty)
      balance.available = (
        BigInt(balance.available) + equityToReturn
      ).toString()
      balance.locked = (BigInt(balance.locked) - equityToReturn).toString()
    }
  }

  const filledQty = BigInt(msg.qty) - remainingQty
  const status =
    filledQty === BigInt(msg.qty)
      ? 'FILLED'
      : filledQty > 0n
        ? 'PARTIALLY_FILLED'
        : 'OPEN'

  const addedToBook = remainingQty > 0n && msg.type === 'LIMIT'

  const insuranceContribution = (totalFeesCollected * INSURANCE_FEE_RATIO_BPS) / BPS_DIVISOR

  return {
    success: true,
    filledQty,
    status,
    fills,
    fullyFilledMakerORderIds,
    addedToBook,
    makerOrderUpdates,
    totalFeesCollected,
    insuranceContribution,
  }
}

export type OrderIndexEntry = {
  marketId: string
  side: 'BID' | 'ASK'
  price: string
}

export function cancelOrder(
  orderId: string,
  userId: string,
  orderIndex: Map<string, OrderIndexEntry>,
  orderbooks: Map<string, Orderbook>,
  balances: Map<string, Balance>
): CancelResult {
  const indexEntry = orderIndex.get(orderId)
  if (!indexEntry) {
    return {
      success: false,
      reason: 'order not found',
    }
  }

  const ob = orderbooks.get(indexEntry.marketId)
  if (!ob) {
    return {
      success: false,
      reason: 'orderbook not found',
    }
  }

  const side = indexEntry.side === 'BID' ? ob.bids : ob.asks
  const level = side.get(indexEntry.price)
  if (!level) {
    return {
      success: false,
      reason: 'price level not found',
    }
  }

  const order = level.orders.find(o => o.orderId === orderId)
  if (!order) {
    return {
      success: false,
      reason: 'order not found in price level',
    }
  }

  if (order.userId !== userId) {
    return {
      success: false,
      reason: 'only owner can cancel the order',
    }
  }
  const unfilledQty = order.qty - order.filledQty

  const marginToReturn = (order.initialMargin * unfilledQty) / order.qty

  level.orders = level.orders.filter(o => o.orderId !== orderId)
  level.availableQty -= unfilledQty
  if (level.availableQty === 0n) {
    side.delete(indexEntry.price)
  }

  const balance = balances.get(userId)
  if (balance) {
    balance.available = (BigInt(balance.available) + marginToReturn).toString()
    balance.locked = (BigInt(balance.locked) - marginToReturn).toString()
  }

  orderIndex.delete(orderId)
  return {
    success: true,
    marginReturned: marginToReturn,
  }
}
