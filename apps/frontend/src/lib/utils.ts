import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatPrice = (price: string | number) => {
  return parseFloat(price.toString()).toFixed(2)
}
export const formatQty = (qty: string | number) => {
  return parseFloat(qty.toString()).toFixed(4)
}
