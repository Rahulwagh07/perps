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
}

export type EngineResponse = {
  identifier: string
  oderId: string
  filledQty: string
  status: OrderStatus
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
  bids: [string, string[]]
  asks: [string, string[]]
}

export type CancelOrderStreamMessage = {
  msgType: 'CANCEL_ORDER'
  orderId: string
  userId: string
  identifier: string
  queueId: string
}

export type OrderStreamMessage =
  | CreateOrderStreamMessage
  | CancelOrderStreamMessage
