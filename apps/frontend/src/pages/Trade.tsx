import { Header } from '../components/trading/Header'
import { Chart } from '../components/trading/Chart'
import { Orderbook } from '../components/trading/Orderbook'
import { OrderEntry } from '../components/trading/OrderEntry'
import { UserPanel } from '../components/trading/UserPanel'
import { useMarketStore } from '../store/market'
import { TradeSkeleton } from '../components/trading/TradeSkeleton'
import { useState } from 'react'

export function Trade() {
  const activeMarket = useMarketStore(state => state.activeMarket)
  const [isOrderEntryOpen, setIsOrderEntryOpen] = useState(false)

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-zinc-950">
      <Header />

      {!activeMarket ? (
        <TradeSkeleton />
      ) : (
        <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden pb-20 lg:pb-0 relative">
          <div className="flex-1 flex flex-col min-w-0 min-h-[600px] lg:min-h-0 relative z-10">
            <div className="flex-[3] min-h-[400px] lg:min-h-0 relative">
              <Chart />
            </div>
            <div className="flex-[2] min-h-[300px] flex flex-col min-h-0">
              <UserPanel />
            </div>
          </div>

          <div className="hidden lg:flex w-[620px] border-l border-zinc-800 shrink-0 relative z-0">
            <div className="flex-1 border-r border-zinc-800">
              <Orderbook />
            </div>
            <div className="w-[320px]">
              <OrderEntry />
            </div>
          </div>

          <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-zinc-950 border-t border-zinc-800 z-40">
            <button
              onClick={() => setIsOrderEntryOpen(true)}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-md text-lg shadow-lg"
            >
              Trade / Place Order
            </button>
          </div>

          {isOrderEntryOpen && (
            <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm">
              <div
                className="absolute inset-0"
                onClick={() => setIsOrderEntryOpen(false)}
              />
              <div className="bg-zinc-950 w-full max-h-[90vh] rounded-t-2xl flex flex-col relative z-10 border-t border-zinc-800 shadow-2xl overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b border-zinc-800 shrink-0">
                  <h2 className="text-lg font-bold text-zinc-100">
                    Place Order
                  </h2>
                  <button
                    onClick={() => setIsOrderEntryOpen(false)}
                    className="text-zinc-400 hover:text-zinc-100 p-2 font-bold text-xl leading-none"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <OrderEntry />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
