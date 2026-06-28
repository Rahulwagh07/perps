import { useState } from 'react'
import { api } from '../../lib/api'
import { useMarketStore } from '../../store/market'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useWebSocket } from '../../hooks/useWebSocket'
import { Slider } from '@/components/ui/slider'
import { fromScale, calculateLiquidationPrice } from '../../lib/utils'
import { DEFAULT_SLIPPAGE_BPS, SLIPPAGE_OPTIONS_BPS } from '../../lib/constants'

export function OrderEntry() {
  const { activeMarket } = useMarketStore()
  const { depth } = useWebSocket()

  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [type, setType] = useState<'market' | 'limit'>('limit')
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('')
  const [leverage, setLeverage] = useState(1.1)
  const [loading, setLoading] = useState(false)
  const [slippage, setSlippage] = useState(DEFAULT_SLIPPAGE_BPS)

  const getEstimatedPrice = () => {
    if (type === 'limit' && price) {
      return Number(price)
    }

    const lastTradedPrice = depth.lastTradedPrice
      ? fromScale(depth.lastTradedPrice)
      : 0
    const currentPrice = lastTradedPrice || depth.markPrice || 0

    if (type === 'limit') {
      if (side === 'buy') {
        return currentPrice ? Math.floor(currentPrice) : 0
      } else {
        return currentPrice ? Math.ceil(currentPrice) : 0
      }
    }

    if (side === 'buy' && depth.asks.length > 0)
      return fromScale(Number(depth.asks[0][0]))
    if (side === 'sell' && depth.bids.length > 0)
      return fromScale(Number(depth.bids[0][0]))

    return currentPrice
  }

  const handlePlaceOrder = async () => {
    if (!activeMarket) return

    const estimatedPrice = getEstimatedPrice()
    if (estimatedPrice === 0) {
      toast.error('Error', {
        description: 'Cannot determine market price. Orderbook is empty.',
      })
      return
    }

    setLoading(true)

    try {
      const response = await api.post('/order', {
        marketId: activeMarket.id,
        type,
        side: side === 'buy' ? 'bid' : 'ask',
        price: estimatedPrice,
        qty: Number(quantity),
        initialMargin: (Number(quantity) * estimatedPrice) / leverage || 1,
        slippage: type === 'market' ? slippage : undefined,
      })

      if (response.data?.engineResponse?.status === 'CANCELLED') {
        toast.error('Error', {
          description:
            response.data.engineResponse.error || 'Order rejected by engine',
        })
      } else {
        toast.success('Success', { description: 'Order placed successfully' })
        setQuantity('')
        if (type === 'limit') setPrice('')
      }
    } catch (error) {
      const err = error as {
        response?: { data?: { message?: string; error?: string } }
      }
      toast.error('Error', {
        description:
          err.response?.data?.error ||
          err.response?.data?.message ||
          'Failed to place order',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!activeMarket) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-500 bg-zinc-950">
        Select a market
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950 p-4 w-[320px]">
      <Tabs
        defaultValue="buy"
        onValueChange={(v: string) => setSide(v as 'buy' | 'sell')}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2 bg-zinc-900 p-1 mb-4 h-12">
          <TabsTrigger
            value="buy"
            className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white font-bold"
          >
            Buy / Long
          </TabsTrigger>
          <TabsTrigger
            value="sell"
            className="data-[state=active]:bg-red-500 data-[state=active]:text-white font-bold"
          >
            Sell / Short
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex items-center gap-2 mb-6">
        <div className="flex bg-zinc-900/80 rounded-md p-1 border border-zinc-800">
          <button
            onClick={() => setType('market')}
            className={`px-4 py-1 text-sm font-medium rounded transition-all ${
              type === 'market'
                ? 'bg-zinc-800 text-cyan-400 border border-cyan-500/50 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            Market
          </button>
          <button
            onClick={() => setType('limit')}
            className={`px-4 py-1 text-sm font-medium rounded transition-all ${
              type === 'limit'
                ? 'bg-zinc-800 text-cyan-400 border border-cyan-500/50 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            Limit
          </button>
        </div>

        <div className="flex-1 flex justify-end">
          {type === 'market' ? (
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-md h-[34px] flex items-center px-3 w-full justify-end">
              <span className="text-zinc-500 font-mono text-sm mr-2">≈</span>
              <span className="text-zinc-300 font-mono text-sm">
                ${getEstimatedPrice().toFixed(2)}
              </span>
            </div>
          ) : (
            <div className="relative w-full">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">
                USDT
              </span>
              <Input
                type="number"
                placeholder={getEstimatedPrice().toFixed(2)}
                value={price}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setPrice(e.target.value)
                }
                className="bg-zinc-900 border-zinc-800 text-right font-mono h-[34px] w-full pl-12"
              />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs text-zinc-400">
            <label>Amount ({activeMarket.slug.split(/[-_]/)[0]})</label>
          </div>
          <Input
            type="number"
            placeholder="0.00"
            value={quantity}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setQuantity(e.target.value)
            }
            className="bg-zinc-900 border-zinc-800 text-right font-mono"
          />
        </div>

        {/* Leverage Slider */}
        <div className="space-y-4 pt-4 border-t border-zinc-800 mt-6">
          <div className="flex justify-between items-center text-zinc-400">
            <button
              className="p-1 hover:text-zinc-100 font-mono"
              onClick={() =>
                setLeverage(l => Math.max(1.1, +(l - 0.1).toFixed(1)))
              }
            >
              -
            </button>
            <span className="text-zinc-100 font-bold">
              {leverage.toFixed(1)}x
            </span>
            <button
              className="p-1 hover:text-zinc-100 font-mono"
              onClick={() =>
                setLeverage(l => Math.min(10, +(l + 0.1).toFixed(1)))
              }
            >
              +
            </button>
          </div>
          <Slider
            value={[leverage]}
            min={1.1}
            max={10}
            step={0.1}
            onValueChange={(val: number[]) => setLeverage(val[0])}
            className="py-2"
          />
          <div className="flex justify-between text-xs text-zinc-500 font-mono">
            <span
              className="cursor-pointer hover:text-zinc-300"
              onClick={() => setLeverage(1.1)}
            >
              1.1x
            </span>
            <span
              className="cursor-pointer hover:text-zinc-300"
              onClick={() => setLeverage(2)}
            >
              2x
            </span>
            <span
              className="cursor-pointer hover:text-zinc-300"
              onClick={() => setLeverage(5)}
            >
              5x
            </span>
            <span
              className="cursor-pointer hover:text-zinc-300"
              onClick={() => setLeverage(8)}
            >
              8x
            </span>
            <span
              className="cursor-pointer hover:text-zinc-300"
              onClick={() => setLeverage(10)}
            >
              10x
            </span>
          </div>
        </div>
      </div>

      <OrderSummary
        type={type}
        side={side}
        leverage={leverage}
        quantity={quantity}
        slippage={slippage}
        setSlippage={setSlippage}
        estimatedPrice={getEstimatedPrice()}
      />

      <Button
        className={`w-full h-12 font-bold text-lg mt-2 ${
          side === 'buy'
            ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
            : 'bg-red-500 hover:bg-red-600 text-white'
        }`}
        onClick={handlePlaceOrder}
        disabled={loading || !quantity || (type === 'limit' && !price)}
      >
        {side === 'buy' ? 'Buy / Long' : 'Sell / Short'}
      </Button>
    </div>
  )
}

function OrderSummary({
  type,
  side,
  leverage,
  quantity,
  slippage,
  setSlippage,
  estimatedPrice,
}: {
  type: 'market' | 'limit'
  side: 'buy' | 'sell'
  leverage: number
  quantity: string
  slippage: number
  setSlippage: (val: number) => void
  estimatedPrice: number
}) {
  return (
    <div className="space-y-2 mt-4 mb-2 pt-4 border-t border-zinc-800">
      <div className="flex justify-between text-xs">
        <span className="text-zinc-400">Entry Price</span>
        <span className="text-zinc-200 font-mono">
          ${estimatedPrice.toFixed(2)}
        </span>
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-zinc-400">Liquidation Price</span>
        <span className="text-zinc-200 font-mono">
          $
          {calculateLiquidationPrice(side, estimatedPrice, leverage).toFixed(2)}
        </span>
      </div>
      {type === 'market' && (
        <div className="flex justify-between text-xs items-center">
          <span className="text-zinc-400">Slippage</span>
          <div className="flex gap-1.5">
            {SLIPPAGE_OPTIONS_BPS.map(val => (
              <span
                key={val}
                onClick={() => setSlippage(val)}
                className={`cursor-pointer px-1.5 py-0.5 rounded font-mono border ${
                  slippage === val
                    ? 'bg-zinc-800 text-zinc-100 border-zinc-700'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {val / 100}%
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="flex justify-between text-xs">
        <span className="text-zinc-400">Total Fees</span>
        <span className="text-zinc-200 font-mono">
          ≈ ${(estimatedPrice * (Number(quantity) || 0) * 0.0004).toFixed(4)}
        </span>
      </div>
    </div>
  )
}
