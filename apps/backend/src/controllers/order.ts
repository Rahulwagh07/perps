import type { Request, Response } from 'express'
import { createOrderSchema } from '../schema/order-schema'
import { prisma } from '@repo/db'
import type { CreateOrderStreamMessage, EngineResponse } from '@repo/types'
import { QUEUE_ID } from '..'
import { redis } from '../redis'

export async function CreateOrder(req: Request, res: Response) {
  const result = createOrderSchema.safeParse(req.body)

  if (!result.success) {
    return res.status(400).json({
      error: result.error.issues,
    })
  }

  try {
    const { type, side, price, qty, marketId, initialMargin } = result.data
    const order = await prisma.order.create({
      data: {
        userId: req.userId,
        marketId,
        type: type === 'limit' ? 'LIMIT' : 'MARKET',
        side: side === 'bid' ? 'BID' : 'ASK',
        price: BigInt(price),
        qty: BigInt(qty),
        filledQty: 0n,
        initialMargin: BigInt(initialMargin),
        status: 'OPEN',
      },
    })

    const identifier = `${Date.now()}-${Math.random().toString(24).slice(1)}`

    const message: CreateOrderStreamMessage = {
      msgType: 'CREATE_ORDER',
      orderId: order.id,
      userId: req.userId,
      marketId,
      type: type === 'market' ? 'MARKET' : 'LIMIT',
      side: side === 'ask' ? 'ASK' : 'BID',
      price: price.toString(),
      qty: qty.toString(),
      initialMargin: initialMargin.toString(),
      identifier,
      queueId: QUEUE_ID,
    }

    await redis.xAdd('orders:stream', '*', message as Record<string, string>)

    const responseKey = `response:${QUEUE_ID}:${identifier}`

    const response = await redis.xRead([{ key: responseKey, id: '0-0' }], {
      BLOCK: 5000,
      COUNT: 1,
    }) //"0-0" - read from start. and wait up to 5sec

    await redis.del(responseKey)

    if (!response || response.length === 0) {
      //order failed
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' },
      })
      return res.status(501).json({
        error: 'engine timeout',
      })
    }

    const engineResponse = response[0]?.messages[0].message as EngineResponse

    console.log('ENGINRESPONSE', engineResponse)

    return res.status(200).json({
      engineResponse,
    })
  } catch (error) {
    console.log('Error creating order', error)
    return res.status(500).json({
      error: 'internal server error',
    })
  }
}
