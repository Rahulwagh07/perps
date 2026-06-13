import type { Request, Response } from 'express'
import { redis } from '../redis'

export async function GetDepth(req: Request, res: Response) {
  const cached = await redis.get(`depth:cache:${req.params.marketId}`)

  if (!cached) {
    return res.status(200).json({
      marketId: req.params.marketId,
      bids: [],
      asks: [],
      lastTradedPrice: 0,
    })
  }

  return res.status(200).json(JSON.parse(cached))
}
