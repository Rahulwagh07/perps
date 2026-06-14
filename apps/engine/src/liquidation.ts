import type { CreateOrderStreamMessage, Position } from '@repo/types'
import { BPS_DIVISOR, MAINTENANCE_MARGIN_BPS } from './constant'

export type LiquidationCheckResult = {
  userId: string
  marketId: string
  position: Position
  remainingEquity: BigInt
  maintenanceMargin: BigInt
}

//scan through all position for a market and return those needs liquidation
export function findLiquidatablePositions(
  marketId: string,
  markPrice: bigint,
  positions: Map<string, Map<string, Position>>
): LiquidationCheckResult[] {
  const results: LiquidationCheckResult[] = []

  for (const [userId, userPositions] of positions) {
    const pos = userPositions.get(marketId)
    if (!pos) continue
    const qty = BigInt(pos.qty)
    const entryPrice = BigInt(pos.averagePrice)
    const equity = BigInt(pos.equity)

    const unrealizedPnl =
      pos.side === 'long'
        ? (markPrice - entryPrice) * qty
        : (entryPrice - markPrice) * qty

    const remainingEquity = equity + unrealizedPnl
    const notional = markPrice * qty
    const maintenanceMargin = (notional * MAINTENANCE_MARGIN_BPS) / BPS_DIVISOR

    if (remainingEquity <= maintenanceMargin) {
      results.push({
        userId,
        marketId,
        position: pos,
        remainingEquity,
        maintenanceMargin,
      })
    }
  }

  return results
}

export function buildLiquidationOrder(
  userId: string,
  marketId: string,
  position: Position,
  markPrice: string
): CreateOrderStreamMessage {
  //close the position
  const side = position.side === 'long' ? 'ASK' : 'BID'

  return {
    msgType: 'CREATE_ORDER',
    orderId: `liq-${userId}-${Date.now()}`,
    userId,
    marketId,
    type: 'MARKET',
    side,
    price: markPrice, //for ref only
    qty: position.qty,
    initialMargin: '0', // no new margin needed. closing
    identifier: `liq-${Date.now()}`,
    queueId: 'liquidation',
    isLiquidation: true,
  }
}

//after a liquidation order fills. cal surplus/deficit
//surplus- remaining equity after close
//deficit- negative equity-> needs insurance fund
export function calculateLiquidationResult(
  position: Position,
  fillPrice: bigint,
  fillQty: bigint
) {
  const entryPrice = BigInt(position.averagePrice)
  const equity = BigInt(position.equity)

  const pnl =
    position.side === 'long'
      ? (fillPrice - entryPrice) * fillQty
      : (entryPrice - fillPrice) * fillQty

  const remainingEquity = equity + pnl
  const surplus = remainingEquity >= 0n ? remainingEquity : 0n
  const deficit = remainingEquity <= 0n ? -remainingEquity : 0n

  return {
    surplus,
    deficit,
    realizedPnl: pnl,
  }
}
