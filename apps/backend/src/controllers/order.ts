import type { Request, Response } from 'express'
import { createOrderSchema, deleteOrderSchema } from '../schema/order-schema'
import { prisma } from '@repo/db'
import type {
  CancelOrderStreamMessage,
  CreateOrderStreamMessage,
  EngineResponse,
} from '@repo/types'
import { NUMBER_SCALE } from '@repo/types'
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

    if (type === 'limit') {
      const depthCache = await redis.get(`depth:cache:${marketId}`)
      if (depthCache) {
        const depth = JSON.parse(depthCache)
        const currentPrice = depth.lastTradedPrice || depth.markPrice || 0
        if (currentPrice > 0) {
          if (side === 'bid' && price > currentPrice) {
            return res.status(400).json({
              error:
                'Buy limit price cannot be higher than current market price',
            })
          }
          if (side === 'ask' && price < currentPrice) {
            return res.status(400).json({
              error:
                'Sell limit price cannot be lower than current market price',
            })
          }
        }
      }
    }

    const order = await prisma.order.create({
      data: {
        userId: req.userId,
        marketId,
        type: type === 'limit' ? 'LIMIT' : 'MARKET',
        side: side === 'bid' ? 'BID' : 'ASK',
        price: BigInt(Math.round(price * NUMBER_SCALE)),
        qty: BigInt(Math.round(qty * NUMBER_SCALE)),
        filledQty: 0n,
        initialMargin: BigInt(Math.round(initialMargin * NUMBER_SCALE)),
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
      price: Math.round(price * NUMBER_SCALE).toString(),
      qty: Math.round(qty * NUMBER_SCALE).toString(),
      initialMargin: Math.round(initialMargin * NUMBER_SCALE).toString(),
      identifier,
      queueId: QUEUE_ID,
    }

    await redis.xAdd(
      'orders:stream',
      '*',
      message as unknown as Record<string, string>
    )

    const response = await waitForEngineResponse(QUEUE_ID, identifier)

    console.log('Reponse', response)

    if (!response || response.length === 0) {
      //order failed
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' },
      })
      await redis.publish(
        `user:${req.userId}`,
        JSON.stringify({ event: 'USER_UPDATE' })
      )
      return res.status(501).json({
        error: 'engine timeout',
      })
    }

    const engineResponse = response as EngineResponse
    console.log('ENGINRESPONSE', engineResponse)

    if (engineResponse.status === 'CANCELLED') {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' },
      })
    }

    await redis.publish(
      `user:${req.userId}`,
      JSON.stringify({ event: 'USER_UPDATE' })
    )

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

export async function DeleteOrder(req: Request, res: Response) {
  try {
    const result = deleteOrderSchema.safeParse(req.params)
    if (!result.success) {
      return res.status(400).json({
        error: result.error.issues,
      })
    }

    const { orderId } = result.data

    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
      },
    })

    if (!order) {
      return res.status(404).json({ error: 'order not found' })
    }
    if (order.userId !== req.userId) {
      return res.status(404).json({ error: 'you are not owner of the order' })
    }
    if (order.status !== 'OPEN' && order.status !== 'PARTIALLY_FILLED') {
      return res
        .status(400)
        .json({ error: ` can not cancel order with status: ${order.status}` })
    }
    const identifier = makeIdentifier()

    const message: CancelOrderStreamMessage = {
      msgType: 'CANCEL_ORDER',
      orderId,
      userId: req.userId,
      identifier,
      queueId: QUEUE_ID,
    }

    await redis.xAdd('orders:stream', '*', message as Record<string, string>)
    const response = await waitForEngineResponse(QUEUE_ID, identifier)

    if (!response) {
      return res.status(504).json({ error: 'engine timeout' })
    }
    if (response.error) {
      return res.status(400).json({ error: response.error })
    }

    await redis.publish(
      `user:${req.userId}`,
      JSON.stringify({ event: 'USER_UPDATE' })
    )

    return res.status(200).json({
      orderId,
      marginReturned: response.marginReturned,
      message: 'order cancelled',
    })
  } catch (error) {
    console.log('Error deleting order', error)
    return res.status(500).json({
      error: 'internal server error',
    })
  }
}

export async function GetOrder(req: Request, res: Response) {
  try {
    const result = deleteOrderSchema.safeParse(req.params)
    if (!result.success) {
      return res.status(400).json({
        error: result.error.issues,
      })
    }

    const { orderId } = result.data

    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
      },
      include: {
        makerFills: true,
        takerFills: true,
      },
    })

    if (!order) {
      return res.status(404).json({ error: 'order not found' })
    }

    if (order.userId !== req.userId) {
      return res.status(400).json({ error: 'you are not owner of the order' })
    }
    return res.status(200).json(order)
  } catch (error) {
    console.log('Error getting order', error)
    return res.status(500).json({
      error: 'internal server error',
    })
  }
}

export async function GetOrders(req: Request, res: Response) {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.userId },
    })
    return res.status(200).json(
      orders.map(order => ({
        ...order,
        price: order.price.toString(),
        qty: order.qty.toString(),
        filledQty: order.filledQty.toString(),
        initialMargin: order.initialMargin.toString(),
      }))
    )
  } catch (error) {
    console.log('Error getting order', error)
    return res.status(500).json({
      error: 'internal server error',
    })
  }
}

export async function GetOpenOrders(req: Request, res: Response) {
  try {
    const orders = await prisma.order.findMany({
      where: {
        userId: req.userId,
        status: { in: ['OPEN', 'PARTIALLY_FILLED'] },
      },
    })
    return res.status(200).json(
      orders.map(order => ({
        ...order,
        price: order.price.toString(),
        qty: order.qty.toString(),
        filledQty: order.filledQty.toString(),
        initialMargin: order.initialMargin.toString(),
      }))
    )
  } catch (error) {
    console.log('Error getting orders', error)
    return res.status(500).json({
      error: 'internal server error',
    })
  }
}

function makeIdentifier() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

async function waitForEngineResponse(queueId: string, identifier: string) {
  const responseKey = `response:${queueId}:${identifier}`

  const response = await redis.xRead([{ key: responseKey, id: '0-0' }], {
    BLOCK: 5000,
    COUNT: 1,
  })

  await redis.del(responseKey)
  return response?.[0]?.messages?.[0]?.message ?? null
}
