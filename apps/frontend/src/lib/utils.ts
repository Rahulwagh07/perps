import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { NUMBER_SCALE } from '@repo/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// convert a scaled BigInt string to number
export const fromScale = (value: string | number): number => {
  return Number(value) / NUMBER_SCALE
}

// format a scaled price
export const formatPrice = (price: string | number) => {
  return fromScale(price).toFixed(2)
}

// format a scaled qty
export const formatQty = (qty: string | number) => {
  return fromScale(qty).toFixed(4)
}

export const calculateLiquidationPrice = (
  side: 'buy' | 'sell',
  entryPrice: number,
  leverage: number,
  maintenanceMarginRatio: number = 0.005
): number => {
  if (side === 'buy') {
    return (entryPrice * (1 - 1 / leverage)) / (1 - maintenanceMarginRatio)
  }
  return (entryPrice * (1 + 1 / leverage)) / (1 + maintenanceMarginRatio)
}
