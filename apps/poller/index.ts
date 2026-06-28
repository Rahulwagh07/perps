import { createClient } from 'redis'
import { configDotenv } from 'dotenv'
configDotenv()
import type { Fill, MakerOrderUpdate, OrderStatus } from '@repo/types'
import { prisma } from '@repo/db'
import { startMarkPriceService } from './mark-price'

const safeBigInt = (val: string | undefined): bigint => {
  if (!val) return BigInt(0)
  try {
    return BigInt(val)
  } catch {
    return BigInt(0)
  }
}
const redis = await createClient({
  url: process.env.REDIS_URL,
})
  .on('error', err => console.log('Redis connect error', err))
  .connect()

const FILLS_STREAM = 'fills:stream'
const FUNDING_STREAM = 'funding:stream'
const GROUP_NAME = 'poller-group'
const CONSUMER_NAME = `poller-${process.pid}`

async function init() {
  try {
    await redis.xGroupCreate(FILLS_STREAM, GROUP_NAME, '0', {
      MKSTREAM: true,
    })
  } catch (err: any) {
    if (!err.message.includes('BUSYGROUP')) throw err
  }

  try {
    await redis.xGroupCreate(FUNDING_STREAM, GROUP_NAME, '0', {
      MKSTREAM: true,
    })
  } catch (err: any) {
    if (!err.message.includes('BUSYGROUP')) throw err
  }

  //recover any fills that were read but not acked before a crash
  await recoverPending(FILLS_STREAM)
  await recoverPending(FUNDING_STREAM)
  await processLoop()
}

async function recoverPending(streamName: string) {
  const result = await redis.xAutoClaim(
    streamName,
    GROUP_NAME,
    CONSUMER_NAME,
    0,
    '0-0'
  )

  for (const msg of result.messages) {
    if (!msg) continue
    if (streamName === FILLS_STREAM) {
      await processStreamMessage(msg.id, msg.message as Record<string, string>)
    } else if (streamName === FUNDING_STREAM) {
      await processFundingMessage(msg.id, msg.message as Record<string, string>)
    }
  }
}

async function processLoop() {
  console.log('writing fills to db')
  while (true) {
    const streams = await redis.xReadGroup(
      GROUP_NAME,
      CONSUMER_NAME,
      [
        { key: FILLS_STREAM, id: '>' },
        { key: FUNDING_STREAM, id: '>' },
      ],
      { COUNT: 5, BLOCK: 0 }
    )

    if (!streams || streams.length === 0) continue

    for (const stream of streams) {
      for (const msg of stream.messages) {
        if (stream.name === FILLS_STREAM) {
          await processStreamMessage(
            msg.id,
            msg.message as Record<string, string>
          )
        } else if (stream.name === FUNDING_STREAM) {
          await processFundingMessage(
            msg.id,
            msg.message as Record<string, string>
          )
        }
      }
    }
  }
}

async function processStreamMessage(
  messageId: string,
  fields: Record<string, string>
) {
  if (fields.orderId) {
    const fills: Fill[] = JSON.parse(fields.fills ?? '[]')
    const makerOrderUpdates: MakerOrderUpdate[] = JSON.parse(
      fields.makerOrderUpdates ?? '[]'
    )

    const makerUpdateMap = new Map<string, MakerOrderUpdate>()

    for (const update of makerOrderUpdates) {
      makerUpdateMap.set(update.orderId, update)
    }

    console.log('FILLS', fills)
    if (!fields.filledQty || !fields.status) {
      throw new Error('invalid fill message')
    }

    try {
      await prisma.$transaction([
        //write all fills
        prisma.fill.createMany({
          data: fills.map(f => ({
            makerId: f.makerId,
            takerId: f.takerId,
            qty: BigInt(f.qty),
            price: BigInt(f.price),
            takerFee: BigInt(f.takerFee ?? '0'),
            makerFee: BigInt(f.makerFee ?? '0'),
            makerOrderId: f.makerOrderId,
            takerOrderId: f.takerOrderId,
            marketId: f.marketId,
          })),
        }),

        //update takers order
        prisma.order.update({
          where: { id: fields.orderId },
          data: {
            filledQty: BigInt(fields.filledQty),
            status: fields.status as OrderStatus,
          },
        }),

        //update each makers order
        ...Array.from(makerUpdateMap.values()).map(update =>
          prisma.order.update({
            where: { id: update.orderId },
            data: {
              filledQty: BigInt(update.filledQty),
              status: update.status as OrderStatus,
            },
          })
        ),
      ])
      console.log(`fills written to db for orderid: ${fields.orderId}`)
    } catch (error) {
      console.error(
        `failed to write fills for orderId: ${fields.orderId}`,
        error
      )
    }

    const affectedUsers = new Set<string>()
    if (fields.userId) affectedUsers.add(fields.userId)
    for (const f of fills) {
      affectedUsers.add(f.makerId)
      affectedUsers.add(f.takerId)
    }

    for (const userId of affectedUsers) {
      await redis.publish(
        `user:${userId}`,
        JSON.stringify({ event: 'USER_UPDATE' })
      )
    }
  } else if (fields.userId && fields.surplus !== undefined) {
    try {
      await prisma.liquidation.create({
        data: {
          userId: fields.userId,
          marketId: fields.marketId || '',
          side: fields.side || '',
          qty: safeBigInt(fields.qty),
          entryPrice: safeBigInt(fields.entryPrice),
          markPrice: safeBigInt(fields.markPrice),
          equity: safeBigInt(fields.equity),
          surplus: safeBigInt(fields.surplus),
          deficit: safeBigInt(fields.deficit),
        },
      })
      console.log(`liquidation written to db for userId: ${fields.userId}`)
    } catch (error) {
      console.error(
        `failed to write liquidation for user: ${fields.userId}`,
        error
      )
    }
  } else {
    console.log('unknown stream message', fields)
  }

  //ACK after db write are completed.
  //if not message stays pending and retires on recovery
  await redis.xAck(FILLS_STREAM, GROUP_NAME, messageId)
}

async function processFundingMessage(
  messageId: string,
  fields: Record<string, string>
) {
  console.log('funding fields', fields)

  const payments: { userId: string; amount: string; side: string }[] =
    JSON.parse(fields.payments ?? '[]')

  if (payments.length > 0) {
    try {
      await prisma.fundingPayment.createMany({
        data: payments.map(p => ({
          marketId: fields.marketId || '',
          side: p.side,
          amount: BigInt(p.amount || '0'),
          fundingRate: BigInt(fields.fundingRate || '0'),
          userId: p.userId,
          createAt: new Date(Number(fields.timestamp || Date.now())),
        })),
      })
      console.log(
        `funding payments written to db for market: ${fields.marketId}`
      )
    } catch (error) {
      console.error(
        `failed to write funding payments for market: ${fields.marketId}`,
        error
      )
    }
  }

  await redis.xAck(FUNDING_STREAM, GROUP_NAME, messageId)
}

const redisPublish = await createClient({
  url: process.env.REDIS_URL,
})
  .on('error', err => console.log('Redis publish error', err))
  .connect()

await Promise.all([init(), startMarkPriceService(redisPublish)])
