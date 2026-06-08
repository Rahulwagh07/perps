import { z } from 'zod'

export const marketSchema = z.object({
  slug: z
    .string()
    .min(4, 'slug must be at least 3 characters')
    .max(40, 'slug is too long'),
  imageUrl: z.url(),
})
