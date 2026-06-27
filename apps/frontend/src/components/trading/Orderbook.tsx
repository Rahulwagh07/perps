import { useWebSocket } from '../../hooks/useWebSocket'
import { useMarketStore } from '../../store/market'
import { formatPrice, formatQty } from '../../lib/utils'

export function Orderbook() {
  const { activeMarket } = useMarketStore()
  const { depth } = useWebSocket()

  if (!activeMarket) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-500">
        Orderbook unavailable
      </div>
    )
  }
  // calculate max total for depth bars
  const asks = [...depth.asks].reverse().map(([price, qty], i, arr) => {
    const total = arr
      .slice(0, i + 1)
      .reduce((acc, curr) => acc + parseFloat(curr[1]), 0)
    return { price, qty, total }
  })

  const bids = depth.bids.map(([price, qty], i, arr) => {
    const total = arr
      .slice(0, i + 1)
      .reduce((acc, curr) => acc + parseFloat(curr[1]), 0)
    return { price, qty, total }
  })

  const maxTotalAsk = asks.length > 0 ? asks[asks.length - 1].total : 0
  const maxTotalBid = bids.length > 0 ? bids[bids.length - 1].total : 0
  const maxTotal = Math.max(maxTotalAsk, maxTotalBid)

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-r border-zinc-800 text-sm font-mono">
      <div className="p-3 border-b border-zinc-800 font-sans font-semibold text-zinc-100">
        Order Book
      </div>
      <div className="flex justify-between px-4 py-2 text-xs text-zinc-500 font-sans">
        <span>Price</span>
        <span>Size</span>
        <span>Total</span>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Asks - rendered bottom up */}
        <div className="flex-1 flex flex-col justify-end overflow-hidden">
          {asks.map((ask, i) => (
            <div
              key={`ask-${i}`}
              className="relative flex justify-between px-4 py-0.5 hover:bg-zinc-900 cursor-pointer group"
            >
              <div
                className="absolute right-0 top-0 bottom-0 bg-red-500/10 transition-all"
                style={{ width: `${(ask.total / maxTotal) * 100}%` }}
              />
              <span className="text-red-500 relative z-10">
                {formatPrice(ask.price)}
              </span>
              <span className="text-zinc-300 relative z-10">
                {formatQty(ask.qty)}
              </span>
              <span className="text-zinc-500 relative z-10">
                {formatQty(ask.total.toString())}
              </span>
            </div>
          ))}
        </div>

        {/* spread / mark price indicator */}
        <div className="py-2 px-4 border-y border-zinc-800 flex items-center gap-3 font-sans">
          <span className="text-emerald-500 font-bold text-lg">
            {bids.length > 0 ? formatPrice(bids[0].price) : '--'}
          </span>
          <span className="text-zinc-500 text-xs  decoration-zinc-600">
            {asks.length > 0 ? formatPrice(asks[asks.length - 1].price) : '--'}
          </span>
        </div>

        {/* Bids- rendered top down */}
        <div className="flex-1 overflow-hidden">
          {bids.map((bid, i) => (
            <div
              key={`bid-${i}`}
              className="relative flex justify-between px-4 py-0.5 hover:bg-zinc-900 cursor-pointer group"
            >
              <div
                className="absolute right-0 top-0 bottom-0 bg-emerald-500/10 transition-all"
                style={{ width: `${(bid.total / maxTotal) * 100}%` }}
              />
              <span className="text-emerald-500 relative z-10">
                {formatPrice(bid.price)}
              </span>
              <span className="text-zinc-300 relative z-10">
                {formatQty(bid.qty)}
              </span>
              <span className="text-zinc-500 relative z-10">
                {formatQty(bid.total.toString())}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
