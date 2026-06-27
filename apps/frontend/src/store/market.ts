import { create } from 'zustand'

export interface Market {
  id: string
  slug: string
  imageUrl: string
}

interface MarketState {
  markets: Market[]
  activeMarket: Market | null
  setMarkets: (markets: Market[]) => void
  setActiveMarket: (market: Market) => void
}

export const useMarketStore = create<MarketState>((set) => ({
  markets: [],
  activeMarket: null,
  setMarkets: (markets) => set({ markets }),
  setActiveMarket: (market) => set({ activeMarket: market }),
}))
