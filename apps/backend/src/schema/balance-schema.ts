import { z } from 'zod'

export const depositSchema = z.object({
  amount: z.coerce.bigint().positive('Amount must be greater than 0'),
})
