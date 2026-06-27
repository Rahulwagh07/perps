import { useWsStore } from '../store/wsStore'

export function useWebSocket() {
  const depth = useWsStore(state => state.depth)
  const userUpdateCount = useWsStore(state => state.userUpdateCount)
  const status = useWsStore(state => state.status)

  return { depth, userUpdateCount, status }
}
