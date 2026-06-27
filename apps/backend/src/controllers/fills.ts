import { prisma } from '@repo/db'
import type { Request, Response } from 'express'

export async function GetFills(req: Request, res: Response) {
  try {
    const fills = await prisma.fill.findMany({
      where: {
        OR: [{ makerId: req.userId }, { takerId: req.userId }],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        makerOrder: true,
        takerOrder: true,
      },
    })
    return res.status(201).json(
      fills.map(fill => {
        const isMaker = fill.makerId === req.userId;
        const side = isMaker 
          ? (fill.makerOrder.side === 'BID' ? 'buy' : 'sell')
          : (fill.takerOrder.side === 'BID' ? 'buy' : 'sell');

        const { makerOrder, takerOrder, ...fillData } = fill;

        return {
          ...fillData,
          side,
          qty: fill.qty.toString(),
          price: fill.price.toString(),
          makerFee: fill.makerFee.toString(),
          takerFee: fill.takerFee.toString(),
        }
      })
    )
  } catch (error) {
    console.log('error getting fills', error)
    return res.status(500).json({
      error: 'internal server error',
    })
  }
}
