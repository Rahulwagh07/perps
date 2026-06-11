import { z } from 'zod'

export const createOrderSchema = z.object({
  type: z.enum(['market', 'limit']),
  side: z.enum(['bid', 'ask']),
  price: z.number().positive(),
  qty: z.number().positive(),
  marketId: z.string(),
  initialMargin: z.number().positive(),
})
