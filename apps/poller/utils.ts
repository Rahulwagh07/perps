import { BINANCE_WS_BASE_URL } from './constant'
import type { MarketMapping } from './types'

export function slugToBinanceSymbol(slug: string): string {
  return slug
    .replace(/_PERP$/i, '')
    .replace(/[-_]/g, '')
    .toLowerCase()
}

export function buildStreamUrl(mappings: MarketMapping[]): string {
  const streams = mappings.map(m => `${m.binanceSymbol}@markPrice@1s`).join('/')
  return `${BINANCE_WS_BASE_URL}/market/stream?streams=${streams}`
}
