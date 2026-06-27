import { useEffect, useRef, useState } from 'react'
import { createChart, CandlestickSeries } from 'lightweight-charts'
import type {
  IChartApi,
  ISeriesApi,
  Time,
  CandlestickData,
} from 'lightweight-charts'
import { useMarketStore } from '../../store/market'
import { api } from '../../lib/api'
import { useWebSocket } from '../../hooks/useWebSocket'
import { CHART_INTERVALS, type ChartInterval } from './chart-constants'

export function Chart() {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const { activeMarket } = useMarketStore()
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const lastCandleRef = useRef<CandlestickData | null>(null)
  const [interval, setIntervalVal] = useState<ChartInterval>('15m')
  const [historyLoadedForMarket, setHistoryLoadedForMarket] = useState<
    string | null
  >(null)
  const [noData, setNoData] = useState(false)
  const { depth } = useWebSocket()

  useEffect(() => {
    if (!chartContainerRef.current) return
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: 'transparent' },
        textColor: '#A1A1AA',
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: '#27272A' },
        horzLines: { color: '#27272A' },
      },
      crosshair: {
        mode: 0,
      },
      timeScale: {
        borderColor: '#27272A',
      },
      rightPriceScale: {
        borderColor: '#27272A',
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
    })

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10B981',
      downColor: '#EF4444',
      borderVisible: false,
      wickUpColor: '#10B981',
      wickDownColor: '#EF4444',
    }) as unknown as ISeriesApi<'Candlestick'>

    chartRef.current = chart
    seriesRef.current = candlestickSeries

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        })
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [])

  // Fetch klines data from backend
  useEffect(() => {
    if (!seriesRef.current || !activeMarket) return
    const fetchKlines = async () => {
      try {
        const res = await api.get(
          `/klines?marketId=${activeMarket.id}&interval=${interval}`
        )
        const data = res.data
        if (!Array.isArray(data)) return
        const formattedData = data.map(
          (d: {
            time: string | number
            open: number
            high: number
            low: number
            close: number
          }) => ({
            time: d.time as Time,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
          })
        )
        seriesRef.current?.setData(formattedData)
        if (formattedData.length > 0) {
          lastCandleRef.current = formattedData[formattedData.length - 1]
          setNoData(false)
        } else {
          lastCandleRef.current = null
          setNoData(true)
        }
        setHistoryLoadedForMarket(activeMarket.id)

        setTimeout(() => {
          const timeScale = chartRef.current?.timeScale()
          if (timeScale && formattedData.length > 0) {
            const totalCandles = formattedData.length
            const VISIBLE_CANDLES = 100
            timeScale.setVisibleLogicalRange({
              from: totalCandles - VISIBLE_CANDLES,
              to: totalCandles + 5,
            })
          }
        }, 50)
      } catch (err) {
        console.log('Failed to fetch klines', err)
      }
    }

    fetchKlines()
  }, [activeMarket, interval])

  // real time live update for the current candle
  useEffect(() => {
    if (
      !seriesRef.current ||
      depth?.lastTradedPrice === undefined ||
      !activeMarket
    )
      return
    if (historyLoadedForMarket !== activeMarket.id) return

    const price = depth.lastTradedPrice
    let intervalMs = 60 * 1000
    if (interval === '5m') intervalMs = 5 * 60 * 1000
    if (interval === '15m') intervalMs = 15 * 60 * 1000

    const currentBucketTime =
      (Math.floor(Date.now() / intervalMs) * intervalMs) / 1000

    if (!lastCandleRef.current) {
      // first candle for a new market with no history
      const newCandle = {
        time: currentBucketTime as Time,
        open: price,
        high: price,
        low: price,
        close: price,
      }
      seriesRef.current.update(newCandle)
      lastCandleRef.current = newCandle
      return
    }

    const last = lastCandleRef.current
    if (currentBucketTime > (last.time as number)) {
      // start a new candle bucket
      const newCandle = {
        time: currentBucketTime as Time,
        open: price, // new candle opens at current price
        high: price,
        low: price,
        close: price,
      }
      seriesRef.current.update(newCandle)
      lastCandleRef.current = newCandle
    } else {
      // stretch the existing candle
      const updatedCandle = {
        ...last,
        high: Math.max(last.high, price),
        low: Math.min(last.low, price),
        close: price,
      }
      seriesRef.current.update(updatedCandle)
      lastCandleRef.current = updatedCandle
    }
  }, [depth?.lastTradedPrice, interval, historyLoadedForMarket, activeMarket])

  return (
    <div className="relative h-full w-full bg-zinc-950 flex flex-col border-r border-zinc-800">
      <div className="p-3 border-b border-zinc-800 flex items-center gap-4">
        <h2 className="text-lg font-bold text-zinc-100">
          {activeMarket ? activeMarket.slug.replace('_PERP', '') : 'Loading...'}
        </h2>
        {activeMarket && (
          <div className="flex bg-zinc-900 rounded-md p-0.5 border border-zinc-800">
            {CHART_INTERVALS.map(inv => (
              <button
                key={inv}
                onClick={() => setIntervalVal(inv)}
                className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                  interval === inv
                    ? 'bg-zinc-800 text-cyan-400'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {inv}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative flex-1 w-full">
        {!activeMarket && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950/80 text-zinc-500">
            No market selected
          </div>
        )}
        {activeMarket && noData && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950/80 text-zinc-500">
            Data not available
          </div>
        )}
        <div
          ref={chartContainerRef}
          className="absolute inset-0 w-full h-full"
        />
      </div>
    </div>
  )
}
