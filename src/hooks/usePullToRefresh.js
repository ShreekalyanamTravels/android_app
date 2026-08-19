import { useCallback, useState } from 'react'
import { useRefreshConfig } from '../context/ConfigContext'

// Wraps an async data-loading function with a `refreshing` flag suitable for
// <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> — pull-to-refresh on any
// screen backed by API data reuses whatever function the screen already loads its data with.
// Also re-fetches /app-config on every pull, so a maintenanceMode/feature-flag change made in the
// backend shows up on the next pull-to-refresh instead of only after a full app relaunch.
export function usePullToRefresh(load) {
  const [refreshing, setRefreshing] = useState(false)
  const refreshConfig = useRefreshConfig()

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([load(), refreshConfig()])
    } finally {
      setRefreshing(false)
    }
  }, [load, refreshConfig])

  return { refreshing, onRefresh }
}
