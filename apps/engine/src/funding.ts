import type { Balance, Position } from '@repo/types'
import { BPS_DIVISOR, MAX_FUNDING_RATE_BPS, BIGINT_SCALE } from './constant'

export type FundingResult = {
  payments: {
    userId: string
    marketId: string
    side: 'long' | 'short'
    amount: bigint //positive= received. negative = paid
  }[]
}

//positive rate: longs pay shorts
//negative rate: shorts pay longs
export function settleFunding(
  marketId: string,
  fundingRate: bigint,
  markPrice: bigint,
  positions: Map<string, Map<string, Position>>,
  balances: Map<string, Balance>
): FundingResult {
  const payments: FundingResult['payments'] = []

  if (fundingRate === 0n) {
    return {
      payments,
    }
  }

  for (const [userId, userPositions] of positions) {
    const pos = userPositions.get(marketId)
    if (!pos) continue
    const qty = BigInt(pos.qty)
    const equity = BigInt(pos.equity)

    //funding payment = positionSize * markPrice * fundingRate
    const positionValue = (qty * markPrice) / BIGINT_SCALE
    const absFundingRate = fundingRate < 0n ? -fundingRate : fundingRate
    const paymentUnsigned = (positionValue * absFundingRate) / BPS_DIVISOR

    let fundingAmount: bigint

    if (pos.side === 'long') {
      fundingAmount = fundingRate > 0n ? -paymentUnsigned : paymentUnsigned
    } else {
      fundingAmount = fundingRate > 0n ? paymentUnsigned : -paymentUnsigned
    }

    const newEquity = equity + fundingAmount
    userPositions.set(marketId, { ...pos, equity: newEquity.toString() })
    const bal = balances.get(userId)
    if (bal) {
      bal.locked = (BigInt(bal.locked) + fundingAmount).toString()
    }

    payments.push({
      userId,
      marketId,
      side: pos.side,
      amount: fundingAmount,
    })
  }

  return {
    payments,
  }
}

export function calculateFundingRate(markPrice: number, indexPrice: number) {
  if (indexPrice === 0) return 0n
  const fundingRate = BigInt(
    Math.round(((markPrice - indexPrice) / indexPrice) * 10000)
  )
  if (fundingRate > MAX_FUNDING_RATE_BPS) return MAX_FUNDING_RATE_BPS
  if (fundingRate < -MAX_FUNDING_RATE_BPS) return -MAX_FUNDING_RATE_BPS
  return fundingRate
}
