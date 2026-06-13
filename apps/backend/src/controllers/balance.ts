import type { Request, Response } from 'express'
import { depositSchema } from '../schema/balance-schema'
import type { DepositStreamMessage } from '@repo/types'
import { QUEUE_ID } from '..'
import { redis } from '../redis'

export async function GetBalance(req: Request, res: Response) {
  const bal = await redis.hGetAll(`balance:${req.userId}`)

  if (!bal || !bal.available) {
    return res.status(200).json({
      available: '0',
      locked: '0',
    })
  }

  return res.status(200).json(bal)
}

export async function Deposit(req: Request, res: Response) {
  const result = depositSchema.safeParse(req.body)

  if (!result.success) {
    return res.status(400).json({
      error: result.error.issues,
    })
  }

  const identifier = `${Date.now()}-${Math.random().toString(36).slice(2)}`

  const { amount } = result.data

  const message: DepositStreamMessage = {
    msgType: 'DEPOSIT',
    userId: req.userId,
    amount: amount.toString(),
    identifier,
    queueId: QUEUE_ID,
  }

  await redis.xAdd('orders:stream', '*', message as Record<string, string>)

  const responseKey = `response:${QUEUE_ID}:${identifier}`

  const response = await redis.xRead([{ key: responseKey, id: '0-0' }], {
    BLOCK: 5000,
    COUNT: 1,
  })

  await redis.del(responseKey)
  if (!response) return res.status(504).json({ error: 'engine timeout error' })

  const data = response[0]?.messages[0].message

  return res.status(200).json({
    available: data.available,
    locked: data.locked,
  })
}
