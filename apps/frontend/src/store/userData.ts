import { create } from 'zustand'

export interface Order {
  id: string
  marketId: string
  price: string
  qty: string
  side: 'buy' | 'sell' | 'BID' | 'ASK'
  filledQty: string
  initialMargin: string
  status: string
  createdAt: string
}

export interface Position {
  marketId: string
  side: 'long' | 'short'
  qty: string
  averagePrice: string
  liquidationPrice: string
  equity: string
  unrealizedPnl: string
}

export interface Fill {
  id: string
  marketId: string
  price: string
  quantity: string
  side: 'buy' | 'sell'
  createdAt: string
}

interface UserDataState {
  balance: string
  orders: Order[]
  positions: Position[]
  fills: Fill[]
  history: Order[]
  setBalance: (balance: string) => void
  setOrders: (orders: Order[]) => void
  setPositions: (positions: Position[]) => void
  setFills: (fills: Fill[]) => void
  setHistory: (history: Order[]) => void
}

export const useUserDataStore = create<UserDataState>((set) => ({
  balance: '0',
  orders: [],
  positions: [],
  fills: [],
  history: [],
  setBalance: (balance) => set({ balance }),
  setOrders: (orders) => set({ orders }),
  setPositions: (positions) => set({ positions }),
  setFills: (fills) => set({ fills }),
  setHistory: (history) => set({ history }),
}))
