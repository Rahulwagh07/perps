import { z } from 'zod'

export const signupSchema = z.object({
  username: z
    .string()
    .min(3, 'username must be at least 3 characters long')
    .max(40, 'username should not exceed 40 characters'),

  password: z.string().min(8, 'password must be at least 8 characters'),
})

export const loginSchema = z.object({
  username: z.string().min(1, 'username is required'),
  password: z.string().min(1, 'password is required'),
})
