import { prisma } from '@repo/db'
import type { Request, Response } from 'express'

export async function GetFills(req: Request, res: Response) {
  try {
    const fills = await prisma.fill.findMany({
      where: {
        OR: [{ makerId: req.userId }, { takerId: req.userId }],
      },
      orderBy: { createdAt: 'desc' },
    })
    return res.status(201).json(
      fills.map(fill => ({
        ...fill,
        qty: fill.qty.toString(),
        price: fill.price.toString(),
      }))
    )
  } catch (error) {
    console.log('error getting fills', error)
    return res.status(500).json({
      error: 'internal server error',
    })
  }
}
