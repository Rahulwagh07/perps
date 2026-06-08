import { prisma } from '@repo/db'
import type { Request, Response } from 'express'
import { marketSchema } from '../schema/market-schema'

export async function CreateMarket(req: Request, res: Response) {
  const result = marketSchema.safeParse(req.body)

  if (!result.success) {
    return res.status(400).json({
      error: result.error.issues,
    })
  }

  try {
    const { slug, imageUrl } = result.data
    const { secret } = req.body
    if (secret !== process.env.ADMIN_SECRET) {
      return res.status(400).json({
        error: 'unauthorized to create market',
      })
    }
    const market = await prisma.market.create({
      data: {
        slug,
        imageUrl,
      },
    })

    return res.status(201).json({
      market,
    })
  } catch (error) {
    console.log('create market error', error)
    return res.status(500).json({
      message: 'internal server error',
    })
  }
}
