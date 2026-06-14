export type OpenOrder = {
  userId: string
  orderId: string
  qty: bigint
  filledQty: bigint
  createdAt: Date
  initialMargin: bigint
}

export type PriceLevel = {
  availableQty: bigint
  orders: OpenOrder[]
}

export type Orderbook = {
  bids: Map<string, PriceLevel>
  asks: Map<string, PriceLevel>
  lastTradedPrice: number
  markPrice: number
}

export type Fill = {
  marketId: string
  takerId: string
  makerId: string
  qty: string
  price: string
  makerOrderId: string
  takerOrderId: string
  takerFee: string
  makerFee: string
}

export type Balance = {
  available: string
  locked: string
}

export type Position = {
  side: 'long' | 'short'
  qty: string
  averagePrice: string
  equity: string
  liquidationPrice: string
  unrealizedPnl: string
}
