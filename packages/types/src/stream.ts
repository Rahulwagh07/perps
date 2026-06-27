import type { OrderStatus, OrderType, Side } from './order'

export type CreateOrderStreamMessage = {
  msgType: 'CREATE_ORDER'
  orderId: string
  userId: string
  marketId: string
  type: OrderType
  side: Side
  price: string
  qty: string
  initialMargin: string
  identifier: string
  queueId: string
  isLiquidation?: boolean
}

export type EngineResponse = {
  identifier: string
  orderId?: string
  filledQty?: string
  status?: OrderStatus
  error?: string
}

export type FillStreamMessage = {
  orderId: string
  userId: string
  marketId: string
  filledQty: string
  status: OrderStatus
  fills: string
}

export type DepthUpdate = {
  marketId: string
  bids: [string, string][]
  asks: [string, string][]
  lastTradedPrice: number
  markPrice?: number
  indexPrice?: number
}

export type CancelOrderStreamMessage = {
  msgType: 'CANCEL_ORDER'
  orderId: string
  userId: string
  identifier: string
  queueId: string
}

export type MarkPriceUpdateMessage = {
  msgType: 'MARK_PRICE_UPDATE'
  marketId: string
  markPrice: string
  indexPrice: string
}

export type DepositStreamMessage = {
  msgType: 'DEPOSIT'
  userId: string
  amount: string
  identifier: string
  queueId: string
}

export type OrderStreamMessage =
  | CreateOrderStreamMessage
  | CancelOrderStreamMessage
  | MarkPriceUpdateMessage
  | DepositStreamMessage

export type MakerOrderUpdate = {
  orderId: string
  filledQty: string
  status: 'FILLED' | 'PARTIALLY_FILLED'
}

export type LiquidationEvent = {
  userId: string
  marketId: string
  side: 'long' | 'short'
  qty: string
  entryPrice: string
  markPrice: string
  equity: string
  surplus: string
  deficit: string
}
