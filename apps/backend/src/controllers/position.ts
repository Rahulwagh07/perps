import type { Request, Response } from 'express'
import { redis } from '../redis'

export async function GetPositions(req: Request, res: Response) {
  try {
    const positionsData = await redis.get(`positions:${req.userId}`)

    if (!positionsData) {
      return res.status(200).json([])
    }

    const positions = JSON.parse(positionsData)
    return res.status(200).json(positions)
  } catch (error) {
    console.log('Error fetching positions:', error)
    return res.status(500).json({ error: 'internal server error' })
  }
}
