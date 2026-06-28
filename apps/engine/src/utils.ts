import type { Balance } from '@repo/types'
import { BPS_DIVISOR, MAKER_FEE_BPS, TAKER_FEE_BPS, BIGINT_SCALE } from './constant'

export function deductFees(
  fillQty: bigint,
  fillPrice: bigint,
  takerBal: Balance,
  makerBal: Balance
) {
  const takerFee = (fillQty * fillPrice * TAKER_FEE_BPS) / (BPS_DIVISOR * BIGINT_SCALE)
  const makerFee = (fillQty * fillPrice * MAKER_FEE_BPS) / (BPS_DIVISOR * BIGINT_SCALE)

  takerBal.available = (BigInt(takerBal.available) - takerFee).toString()
  makerBal.locked = (BigInt(makerBal.locked) - makerFee).toString()

  return { takerFee, makerFee, total: takerFee + makerFee }
}

export function calculatedEstimatedFees(
  qty: bigint,
  price: bigint,
  fee: bigint
) {
  return (qty * price * fee) / (BPS_DIVISOR * BIGINT_SCALE)
}
