import { z } from 'zod'

export const createOrderSchema = z.object({
  type: z.enum(['market', 'limit']),
  side: z.enum(['bid', 'ask']),
  price: z.number().positive(),
  qty: z.number().positive(),
  marketId: z.string(),
  initialMargin: z.number().positive(),
  slippage: z.number().nonnegative().optional(),
})

export const deleteOrderSchema = z.object({
  orderId: z.string().min(1, 'Order id is required'),
})

export const getOrderSchema = z.object({
  orderId: z.string().min(1, 'Order id is required'),
})
