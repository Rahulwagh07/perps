import type { Request, Response } from 'express'
import { redis } from '../redis'
import { marketQuerySchema } from '../schema/order-schema'

export async function GetPositions(req: Request, res: Response) {
  try {
    const result = marketQuerySchema.safeParse(req.query)
    if (!result.success) {
      return res.status(400).json({
        error: result.error.issues,
      })
    }
    const { marketId } = result.data
    const positionsData = await redis.get(`positions:${req.userId}`)

    if (!positionsData) {
      return res.status(200).json([])
    }

    let positions = JSON.parse(positionsData)
    positions = positions.filter((p: any) => p.marketId === marketId)
    
    return res.status(200).json(positions)
  } catch (error) {
    console.log('Error fetching positions:', error)
    return res.status(500).json({ error: 'internal server error' })
  }
}
