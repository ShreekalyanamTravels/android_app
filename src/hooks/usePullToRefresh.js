import { useCallback, useState } from 'react'

// Wraps an async data-loading function with a `refreshing` flag suitable for
// <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> — pull-to-refresh on any
// screen backed by API data reuses whatever function the screen already loads its data with.
export function usePullToRefresh(load) {
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await load()
    } finally {
      setRefreshing(false)
    }
  }, [load])

  return { refreshing, onRefresh }
}
