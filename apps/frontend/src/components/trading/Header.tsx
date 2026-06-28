import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { useMarketStore } from '../../store/market'
import type { Market } from '../../store/market'
import { useAuthStore } from '../../store/auth'
import { useUserDataStore } from '../../store/userData'
import { useWebSocket } from '../../hooks/useWebSocket'
import { formatPrice } from '../../lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Wallet01Icon, Logout01Icon } from 'hugeicons-react'

export function Header() {
  const { markets, setMarkets, activeMarket, setActiveMarket } =
    useMarketStore()
  const { balance, setBalance } = useUserDataStore()
  const logout = useAuthStore(state => state.logout)
  const [loading, setLoading] = useState(true)

  const { userUpdateCount, status } = useWebSocket()

  useEffect(() => {
    async function fetchMarkets() {
      try {
        const { data } = await api.get<Market[]>('/markets')
        setMarkets(data)
        if (data.length > 0) {
          const defaultMarket =
            data.find(m => m.slug === 'SOL_USDT_PERP') || data[0]
          setActiveMarket(defaultMarket)
        }
      } catch (err) {
        console.log('Failed to fetch markets', err)
      } finally {
        setLoading(false)
      }
    }
    fetchMarkets()
  }, [setMarkets, setActiveMarket])

  useEffect(() => {
    async function fetchBalance() {
      try {
        const { data } = await api.get('/balance')
        setBalance(data.available)
      } catch (err) {
        console.error('Failed to fetch balance', err)
      }
    }

    fetchBalance()
  }, [setBalance, userUpdateCount])

  if (loading) {
    return (
      <div className="h-14 border-b border-zinc-800 bg-zinc-950 flex items-center px-4">
        Loading...
      </div>
    )
  }

  return (
    <header className="h-14 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between px-4 sticky top-0 z-50">
      <div className="flex items-center gap-6">
        {markets.length > 0 ? (
          <Select
            value={activeMarket?.id}
            onValueChange={(val: string) => {
              const m = markets.find(m => m.id === val)
              if (m) setActiveMarket(m)
            }}
          >
            <SelectTrigger className="w-[200px] bg-zinc-900 border-zinc-800">
              <SelectValue placeholder="Select Market" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              {markets.map(m => (
                <SelectItem
                  key={m.id}
                  value={m.id}
                  className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-50"
                >
                  {m.slug.replace('_PERP', '')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="text-zinc-500 text-sm">No markets available</div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm bg-zinc-900 px-3 py-1.5 rounded-md border border-zinc-800">
          <div
            className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : status === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`}
          />
          <span className="text-zinc-400 text-xs font-medium capitalize">
            {status}
          </span>
        </div>
        <div className="flex items-center gap-2 text-zinc-300 text-sm bg-zinc-900 px-3 py-1.5 rounded-md border border-zinc-800">
          <Wallet01Icon size={16} />
          <span>${formatPrice(balance)}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={logout}
          className="text-zinc-400 hover:text-zinc-100"
        >
          <Logout01Icon size={18} />
        </Button>
      </div>
    </header>
  )
}
