import { createClient } from 'redis'
import { configDotenv } from 'dotenv'
configDotenv()
import type { Fill, MakerOrderUpdate, OrderStatus } from '@repo/types'
import { prisma } from '@repo/db'

const redis = await createClient({
  url: process.env.REDIS_URL,
})
  .on('error', err => console.log('Redis connect error', err))
  .connect()

const FILLS_STREAM = 'fills:stream'
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

  //recover any fills that were read but not acked before a crash
  await recoverPending()
  await processLoop()
}

async function recoverPending() {
  const result = await redis.xAutoClaim(
    FILLS_STREAM,
    GROUP_NAME,
    CONSUMER_NAME,
    0,
    '0-0'
  )

  for (const msg of result.messages) {
    if (!msg) continue
    await writeFills(msg.id, msg.message as Record<string, string>)
  }
}

async function processLoop() {
  console.log('writing fills to db')
  while (true) {
    const streams = await redis.xReadGroup(
      GROUP_NAME,
      CONSUMER_NAME,
      [{ key: FILLS_STREAM, id: '>' }],
      { COUNT: 5, BLOCK: 0 }
    )

    if (!streams || streams.length === 0) continue

    for (const stream of streams) {
      for (const msg of stream.messages) {
        await writeFills(msg.id, msg.message as Record<string, string>)
      }
    }
  }
}

async function writeFills(messageId: string, fields: Record<string, string>) {
  const fills: Fill[] = JSON.parse(fields.fills ?? '[]')
  const makerOrderUpdates: MakerOrderUpdate[] = JSON.parse(
    fields.makerOrderUpdates ?? '[]'
  )

  const makerUpdateMap = new Map<string, MakerOrderUpdate>()

  for (const update of makerOrderUpdates) {
    makerUpdateMap.set(update.orderId, update)
  }

  console.log('FILLS', fills)
  if (!fields.orderId || !fields.filledQty || !fields.status) {
    throw new Error('invalid fill message')
  }
  await prisma.$transaction([
    //write all fills
    prisma.fill.createMany({
      data: fills.map(f => ({
        makerId: f.makerId,
        takerId: f.takerId,
        qty: BigInt(f.qty),
        price: BigInt(f.price),
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

  //ACK after db write are completed.
  //if not message stays pending and retires on recovery
  await redis.xAck(FILLS_STREAM, GROUP_NAME, messageId)
  console.log(`fills written to db for orderid: ${fields.orderId}`)
}

await init()
