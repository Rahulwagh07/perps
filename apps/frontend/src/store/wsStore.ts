import { create } from 'zustand'
import { useMarketStore } from './market'
import { useAuthStore } from './auth'

interface Depth {
  bids: [string, string][]
  asks: [string, string][]
  lastTradedPrice?: number
  markPrice?: number
  indexPrice?: number
}

interface WsState {
  depth: Depth
  userUpdateCount: number
  status: 'connecting' | 'connected' | 'disconnected'
}

export const useWsStore = create<WsState>(() => ({
  depth: { bids: [], asks: [] },
  userUpdateCount: 0,
  status: 'disconnected',
}))

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8081'
let ws: WebSocket | null = null
let currentMarketId: string | null = null
let currentUserId: string | null = null
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null

function connect() {
  if (
    ws?.readyState === WebSocket.OPEN ||
    ws?.readyState === WebSocket.CONNECTING
  )
    return

  useWsStore.setState({ status: 'connecting' })
  ws = new WebSocket(WS_URL)

  ws.onopen = () => {
    useWsStore.setState({ status: 'connected' })
    if (currentMarketId) {
      ws!.send(
        JSON.stringify({
          method: 'SUBSCRIBE',
          params: [`depth.${currentMarketId}`],
        })
      )
    }
    if (currentUserId) {
      ws!.send(
        JSON.stringify({
          method: 'SUBSCRIBE',
          params: [`user.${currentUserId}`],
        })
      )
    }
  }

  ws.onmessage = event => {
    try {
      const payload = JSON.parse(event.data)
      if (
        payload.stream === 'depth' &&
        payload.data?.marketId === currentMarketId
      ) {
        useWsStore.setState({
          depth: {
            bids: payload.data.bids.slice(0, 15),
            asks: payload.data.asks.slice(0, 15),
            lastTradedPrice: payload.data.lastTradedPrice,
            markPrice: payload.data.markPrice,
            indexPrice: payload.data.indexPrice,
          },
        })
      } else if (
        payload.stream === 'user' &&
        payload.data?.event === 'USER_UPDATE'
      ) {
        useWsStore.setState(state => ({
          userUpdateCount: state.userUpdateCount + 1,
        }))
      }
    } catch (e) {
      console.log('Failed to parse ws message', e)
    }
  }

  ws.onclose = () => {
    useWsStore.setState({ status: 'disconnected' })
    if (reconnectTimeout) clearTimeout(reconnectTimeout)
    reconnectTimeout = setTimeout(connect, 3000)
  }
}

// synchronize with market store
useMarketStore.subscribe(state => {
  const newMarketId = state.activeMarket?.id || null
  if (newMarketId !== currentMarketId) {
    if (ws?.readyState === WebSocket.OPEN) {
      if (currentMarketId)
        ws.send(
          JSON.stringify({
            method: 'UNSUBSCRIBE',
            params: [`depth.${currentMarketId}`],
          })
        )
      if (newMarketId)
        ws.send(
          JSON.stringify({
            method: 'SUBSCRIBE',
            params: [`depth.${newMarketId}`],
          })
        )
    }
    currentMarketId = newMarketId
    // clear old depth data
    useWsStore.setState({ depth: { bids: [], asks: [] } })
  }
})

// synchronize with auth store
useAuthStore.subscribe(state => {
  const newUserId = state.userId || null
  if (newUserId !== currentUserId) {
    if (ws?.readyState === WebSocket.OPEN) {
      if (currentUserId)
        ws.send(
          JSON.stringify({
            method: 'UNSUBSCRIBE',
            params: [`user.${currentUserId}`],
          })
        )
      if (newUserId)
        ws.send(
          JSON.stringify({ method: 'SUBSCRIBE', params: [`user.${newUserId}`] })
        )
    }
    currentUserId = newUserId
  }
})

currentMarketId = useMarketStore.getState().activeMarket?.id || null
currentUserId = useAuthStore.getState().userId || null

if (typeof window !== 'undefined') {
  connect()
}
