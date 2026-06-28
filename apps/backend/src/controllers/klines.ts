import { prisma } from '@repo/db'
import type { Request, Response } from 'express'
import { NUMBER_SCALE } from '@repo/types'

export async function GetKlines(req: Request, res: Response) {
  try {
    const { marketId, interval } = req.query
    if (!marketId || typeof marketId !== 'string') {
      return res.status(400).json({ error: 'invalid marketId' })
    }

    let intervalMs = 60 * 1000 // default 1m
    if (interval === '5m') intervalMs = 5 * 60 * 1000
    if (interval === '15m') intervalMs = 15 * 60 * 1000

    const fills = await prisma.fill.findMany({
      where: { marketId },
      orderBy: { createdAt: 'asc' },
    })

    const data = []

    if (fills.length > 0) {
      const firstFill = fills[0]!
      let currentBucketTime =
        Math.floor(firstFill.createdAt.getTime() / intervalMs) * intervalMs
      let currentBucket = {
        time: currentBucketTime / 1000,
        open: Number(firstFill.price) / NUMBER_SCALE,
        high: Number(firstFill.price) / NUMBER_SCALE,
        low: Number(firstFill.price) / NUMBER_SCALE,
        close: Number(firstFill.price) / NUMBER_SCALE,
      }

      for (const fill of fills) {
        const fillTime = fill.createdAt.getTime()
        const price = Number(fill.price) / NUMBER_SCALE

        if (fillTime >= currentBucketTime + intervalMs) {
          data.push(currentBucket)

          currentBucketTime = Math.floor(fillTime / intervalMs) * intervalMs
          currentBucket = {
            time: currentBucketTime / 1000,
            open: price,
            high: price,
            low: price,
            close: price,
          }
        } else {
          currentBucket.high = Math.max(currentBucket.high, price)
          currentBucket.low = Math.min(currentBucket.low, price)
          currentBucket.close = price
        }
      }
      data.push(currentBucket)
    }

    return res.status(200).json(data)
  } catch (error) {
    console.log('get klines error', error)
    return res.status(500).json({ error: 'internal server error' })
  }
}
