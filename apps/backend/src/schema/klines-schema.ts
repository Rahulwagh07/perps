import { z } from 'zod'

export const klinesSchema = z.object({
  marketId: z.string(),
  interval: z.enum(['1m', '5m', '15m']).optional(),
})
