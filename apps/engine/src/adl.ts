import type { Balance, Position } from '@repo/types'
import { BIGINT_SCALE } from './constant'
export type ADLEntry = {
  userId: string
  reducedQty: bigint
  realizedPnl: bigint
}

export type TargetPositionEntry = {
  userId: string
  pos: Position
  profitRatio: bigint
  pnl: bigint
}

export function runADL(
  marketId: string,
  liquidatedSide: 'long' | 'short',
  deficit: bigint,
  markPrice: string,
  positions: Map<string, Map<string, Position>>,
  balances: Map<string, Balance>
): ADLEntry[] {
  const targetSide = liquidatedSide === 'long' ? 'short' : 'long'

  const deleveragedUsers: ADLEntry[] = []
  const targetPositions: TargetPositionEntry[] = []

  for (const [userId, userPositions] of positions) {
    const pos = userPositions.get(marketId)
    if (!pos || pos.side !== targetSide) continue

    const qty = BigInt(pos.qty)
    const entryPrice = BigInt(pos.averagePrice)

    const pnl =
      targetSide === 'long'
        ? ((BigInt(markPrice) - entryPrice) * qty) / BIGINT_SCALE
        : ((entryPrice - BigInt(markPrice)) * qty) / BIGINT_SCALE

    //skip unprofitable positions
    if (pnl <= 0n) continue

    const profitRatio = calculateProfitRatio(pnl, BigInt(pos.equity))
    targetPositions.push({ userId, pos, profitRatio, pnl })
  }
  //sort by most profitable first
  targetPositions.sort((a, b) => Number(b.profitRatio - a.profitRatio))
  let remainingDeficit = deficit

  for (const target of targetPositions) {
    if (remainingDeficit <= 0n) break
    const pos = target.pos
    const qty = BigInt(pos.qty)
    const equity = BigInt(pos.equity)

    const pnlPerUnit = (target.pnl * BIGINT_SCALE) / qty
    const qtyNeededToCoverDeficit =
      pnlPerUnit > 0n ? (remainingDeficit + pnlPerUnit - 1n) / pnlPerUnit : qty

    const actualReduceQty =
      qtyNeededToCoverDeficit > qty ? qty : qtyNeededToCoverDeficit
    const pnlRealized = (pnlPerUnit * actualReduceQty) / BIGINT_SCALE
    const equityReturned = (equity * actualReduceQty) / qty

    reducePosition(
      target.userId,
      marketId,
      pos,
      actualReduceQty,
      pnlRealized,
      equityReturned,
      positions,
      balances
    )

    remainingDeficit -= pnlRealized
    deleveragedUsers.push({
      userId: target.userId,
      reducedQty: actualReduceQty,
      realizedPnl: pnlRealized,
    })
  }

  return deleveragedUsers
}

function calculateProfitRatio(pnl: bigint, equity: bigint) {
  return equity > 0n ? (pnl * 10000n) / equity : 0n
}

function reducePosition(
  userId: string,
  marketId: string,
  pos: Position,
  qtyToReduce: bigint,
  pnlRealized: bigint,
  equityReturned: bigint,
  positions: Map<string, Map<string, Position>>,
  balances: Map<string, Balance>
) {
  const qty = BigInt(pos.qty)
  const equity = BigInt(pos.equity)

  //update balance
  const bal = balances.get(userId)

  if (bal) {
    bal.available = (
      BigInt(bal.available) +
      equityReturned +
      pnlRealized
    ).toString()

    bal.locked = (BigInt(bal.locked) - equityReturned).toString()
  }
  //update position
  if (qtyToReduce >= qty) {
    positions.get(userId)?.delete(marketId)
  } else {
    const userPositions = positions.get(userId)
    userPositions?.set(marketId, {
      ...pos,
      qty: (qty - qtyToReduce).toString(),
      equity: (equity - equityReturned).toString(),
    })
  }
}
