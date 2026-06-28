import { useEffect } from 'react'
import { api } from '../../lib/api'
import { useUserDataStore } from '../../store/userData'
import { useMarketStore } from '../../store/market'
import { useWebSocket } from '../../hooks/useWebSocket'
import { fromScale } from '../../lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function UserPanel() {
  const { history, orders, positions, setHistory, setOrders, setPositions } =
    useUserDataStore()
  const { activeMarket, markets } = useMarketStore()

  const { depth, userUpdateCount } = useWebSocket()

  useEffect(() => {
    if (!activeMarket) return

    async function fetchData() {
      try {
        const [historyRes, ordersRes, positionsRes] = await Promise.all([
          api.get(`/orders`),
          api.get(`/orders/open?marketId=${activeMarket?.id}`),
          api.get(`/positions`),
        ])
        setHistory(historyRes.data)
        setOrders(ordersRes.data)
        setPositions(positionsRes.data)
      } catch (err) {
        console.error('Failed to fetch user data', err)
      }
    }

    fetchData()
  }, [activeMarket, setHistory, setOrders, setPositions, userUpdateCount])

  return (
    <div className="h-full bg-zinc-950 flex flex-col border-t border-zinc-800 min-h-0">
      <Tabs defaultValue="positions" className="flex-1 flex flex-col min-h-0">
        <div className="border-b border-zinc-800 px-4">
          <TabsList className="bg-transparent h-12">
            <TabsTrigger
              value="positions"
              className="border-b-2 border-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-zinc-50 rounded-none px-4 h-full text-zinc-400 data-[state=active]:text-zinc-50"
            >
              Positions
            </TabsTrigger>
            <TabsTrigger
              value="orders"
              className="border-b-2 border-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-zinc-50 rounded-none px-4 h-full text-zinc-400 data-[state=active]:text-zinc-50"
            >
              Open Orders
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="border-b-2 border-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-zinc-50 rounded-none px-4 h-full text-zinc-400 data-[state=active]:text-zinc-50"
            >
              History
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-auto">
          <TabsContent value="positions" className="m-0 mt-0 p-0 outline-none">
            {!positions || positions.length === 0 ? (
              <div className="h-32 flex items-center justify-center text-sm text-zinc-500">
                No open positions
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead className="text-zinc-400">Market</TableHead>
                    <TableHead className="text-zinc-400">Side</TableHead>
                    <TableHead className="text-zinc-400 text-right">
                      Size
                    </TableHead>
                    <TableHead className="text-zinc-400 text-right">
                      Entry/Mark Price
                    </TableHead>
                    <TableHead className="text-zinc-400 text-right">
                      Liq. Price
                    </TableHead>
                    <TableHead className="text-zinc-400 text-right">
                      Collateral
                    </TableHead>
                    <TableHead className="text-zinc-400 text-right">
                      PnL
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positions.map(position => {
                    const markPrice = depth?.markPrice
                    const unscaledQty = fromScale(position.qty)
                    const unscaledAvgPrice = fromScale(position.averagePrice)
                    const unscaledEquity = fromScale(position.equity)
                    const unscaledLiqPrice = fromScale(position.liquidationPrice)

                    let unrealizedPnl = fromScale(position.unrealizedPnl)
                    if (markPrice && position.marketId === activeMarket?.id) {
                      unrealizedPnl =
                        position.side === 'long'
                          ? (markPrice - unscaledAvgPrice) * unscaledQty
                          : (unscaledAvgPrice - markPrice) * unscaledQty
                    }

                    return (
                      <TableRow
                        key={position.marketId}
                        className="border-zinc-800 hover:bg-zinc-900/50"
                      >
                        <TableCell>
                          {markets
                            .find(m => m.id === position.marketId)
                            ?.slug.replace('_PERP', '') ||
                            activeMarket?.slug.replace('_PERP', '')}
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              position.side === 'long'
                                ? 'text-emerald-500'
                                : 'text-red-500'
                            }
                          >
                            {position.side.toUpperCase()}
                          </span>
                          <span className="text-zinc-500 mx-1">/</span>
                          <span className="text-zinc-400 font-mono">
                            {position.equity &&
                            position.qty &&
                            position.averagePrice
                              ? (
                                  (unscaledQty *
                                    unscaledAvgPrice) /
                                  unscaledEquity
                                ).toFixed(2) + 'x'
                              : '-'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          $
                          {(
                            unscaledQty * unscaledAvgPrice
                          ).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          <span>
                            ${unscaledAvgPrice.toFixed(2)}
                          </span>
                          <span className="text-zinc-500 mx-1">/</span>
                          <span className="text-zinc-400">
                            ${markPrice ? markPrice.toFixed(2) : '-'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-orange-400">
                          ${unscaledLiqPrice.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${unscaledEquity.toFixed(2)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono ${unrealizedPnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}
                        >
                          {unrealizedPnl >= 0 ? '+' : ''}
                          {unrealizedPnl.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="orders" className="m-0 mt-0 p-0 outline-none">
            {orders.length === 0 ? (
              <div className="h-32 flex items-center justify-center text-sm text-zinc-500">
                No open orders
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead className="text-zinc-400">Time</TableHead>
                    <TableHead className="text-zinc-400">Market</TableHead>
                    <TableHead className="text-zinc-400">Side</TableHead>
                    <TableHead className="text-zinc-400">Price</TableHead>
                    <TableHead className="text-zinc-400 text-right">
                      Amount
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map(order => {
                    const unscaledPrice = fromScale(order.price)
                    const unscaledQty = fromScale(order.qty)
                    const unscaledMargin = fromScale(order.initialMargin)
                    return (
                    <TableRow
                      key={order.id}
                      className="border-zinc-800 hover:bg-zinc-900/50"
                    >
                      <TableCell className="font-mono text-xs">
                        <div>
                          {new Date(order.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-zinc-500">
                          {new Date(order.createdAt).toLocaleTimeString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        {markets
                          .find(m => m.id === order.marketId)
                          ?.slug.replace('_PERP', '') ||
                          activeMarket?.slug.replace('_PERP', '')}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            order.side === 'buy' || order.side === 'BID'
                              ? 'text-emerald-500'
                              : 'text-red-500'
                          }
                        >
                          {order.side === 'buy' || order.side === 'BID'
                            ? 'LONG'
                            : 'SHORT'}
                        </span>
                        <span className="text-zinc-500 mx-1">/</span>
                        <span className="text-zinc-400 font-mono">
                          {order.initialMargin && order.qty
                            ? (
                                (unscaledPrice * unscaledQty) /
                                unscaledMargin
                              ).toFixed(2) + 'x'
                            : '-'}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono">
                        ${unscaledPrice.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${(unscaledPrice * unscaledQty).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  )})}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="history" className="m-0 mt-0 p-0 outline-none">
            {history.length === 0 ? (
              <div className="h-32 flex items-center justify-center text-sm text-zinc-500">
                No order history
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead className="text-zinc-400">Time</TableHead>
                    <TableHead className="text-zinc-400">Market</TableHead>
                    <TableHead className="text-zinc-400">Side</TableHead>
                    <TableHead className="text-zinc-400">Price</TableHead>
                    <TableHead className="text-zinc-400 text-right">
                      Amount
                    </TableHead>
                    <TableHead className="text-zinc-400 text-right">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map(item => {
                    const unscaledPrice = fromScale(item.price)
                    const unscaledQty = fromScale(item.qty)
                    return (
                    <TableRow
                      key={item.id}
                      className="border-zinc-800 hover:bg-zinc-900/50"
                    >
                      <TableCell className="font-mono text-xs text-zinc-400">
                        {item.createdAt ? (
                          <>
                            <div>
                              {new Date(item.createdAt).toLocaleDateString()}
                            </div>
                            <div className="text-zinc-500">
                              {new Date(item.createdAt).toLocaleTimeString()}
                            </div>
                          </>
                        ) : (
                          <div className="text-zinc-500">-</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {markets
                          .find(m => m.id === item.marketId)
                          ?.slug.replace('_PERP', '') ||
                          activeMarket?.slug.replace('_PERP', '')}
                      </TableCell>
                      <TableCell
                        className={
                          item.side === 'buy' || item.side === 'BID'
                            ? 'text-emerald-500'
                            : 'text-red-500'
                        }
                      >
                        {item.side === 'buy' || item.side === 'BID'
                          ? 'LONG'
                          : 'SHORT'}
                      </TableCell>
                      <TableCell className="font-mono">
                        ${unscaledPrice.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${(unscaledPrice * unscaledQty).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        <span
                          className={`px-2 py-1 rounded-sm bg-zinc-800 ${item.status === 'FILLED' ? 'text-emerald-400' : item.status === 'CANCELLED' ? 'text-red-400' : 'text-zinc-300'}`}
                        >
                          {item.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  )})}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
