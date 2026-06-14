import type { Orderbook } from '@repo/types'
import path from 'path'
import fs from 'fs/promises'

const SNAPSHOT_DIR = path.join(process.cwd(), 'snapshots')

export type Snapshot = {
  timestamp: number
  orderbooks: Record<string, Orderbook>
  balances: Record<
    string,
    {
      available: string
      locked: string
    }
  >
  positions: Record<string, Record<string, any>>
  totalFeesCollected: string
}

export async function takeSnapshot(
  orderbooks: Map<string, Orderbook>,
  balances: Map<string, { available: string; locked: string }>,
  positions: Map<string, Map<string, any>>,
  totalFeesCollected: bigint
) {
  await fs.mkdir(SNAPSHOT_DIR, {
    recursive: true,
  })

  const snapshot: Snapshot = {
    timestamp: Date.now(),
    orderbooks: Object.fromEntries(
      [...orderbooks.entries()].map(([marketId, ob]) => [
        marketId,
        {
          bids: Object.fromEntries(
            [...ob.bids.entries()].map(([price, level]) => [
              price,
              {
                availableQty: level.availableQty.toString(),
                orders: level.orders.map(o => ({
                  ...o,
                  qty: o.qty.toString(),
                  filledQty: o.filledQty.toString(),
                })),
              },
            ])
          ),
          asks: Object.fromEntries(
            [...ob.asks.entries()].map(([price, level]) => [
              price,
              {
                availableQty: level.availableQty.toString(),
                orders: level.orders.map(o => ({
                  ...o,
                  qty: o.qty.toString(),
                  filledQty: o.filledQty.toString(),
                })),
              },
            ])
          ),
          lastTradedPrice: ob.lastTradedPrice,
          markPrice: ob.markPrice,
        },
      ])
    ),

    balances: Object.fromEntries(balances),
    positions: Object.fromEntries(
      [...positions.entries()].map(([string, m]) => [
        string,
        Object.fromEntries(m),
      ])
    ),
    totalFeesCollected: totalFeesCollected.toString(),
  }

  const filename = `snapshot_${Date.now()}.json`
  await fs.writeFile(
    path.join(SNAPSHOT_DIR, filename),
    JSON.stringify(snapshot)
  )
  console.log('SNAPSHOT SAVED..')
}

export async function getLatestSnapshot() {
  try {
    const files = await fs.readdir(SNAPSHOT_DIR)
    const snapshots = files.filter(f => f.startsWith('snapshot_')).sort()

    if (snapshots.length === 0) return
    const latest = snapshots[snapshots.length - 1]

    const raw = await fs.readFile(path.join(SNAPSHOT_DIR, latest), 'utf8')

    return JSON.parse(raw) as Snapshot
  } catch (err) {
    console.log('error getting latest snapshot..', err)
    return
  }
}
