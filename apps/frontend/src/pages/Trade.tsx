import { Header } from '../components/trading/Header'
import { Chart } from '../components/trading/Chart'
import { Orderbook } from '../components/trading/Orderbook'
import { OrderEntry } from '../components/trading/OrderEntry'
import { UserPanel } from '../components/trading/UserPanel'

export function Trade() {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-zinc-950">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-[3] min-h-0 relative">
            <Chart />
          </div>
          <div className="flex-[2] min-h-[300px] flex flex-col min-h-0">
            <UserPanel />
          </div>
        </div>

        <div className="w-[620px] flex border-l border-zinc-800 shrink-0">
          <div className="flex-1 border-r border-zinc-800">
            <Orderbook />
          </div>
          <div>
            <OrderEntry />
          </div>
        </div>
      </div>
    </div>
  )
}
