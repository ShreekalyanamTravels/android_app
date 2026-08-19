import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { Platform } from 'react-native'
import { getConfig, loadConfig } from '../services/configService'

// The native app icon/name shown on the home screen is baked into the binary at build time
// (same constraint as the splash screen) and can't be changed remotely. The one place appName/
// appIconUrl can actually take effect live is the browser tab when running as a web build.
function applyWebBranding(config) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return
  if (config.appName) document.title = config.appName
  if (config.appIconUrl) {
    let link = document.querySelector('link[rel="icon"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.href = config.appIconUrl
  }
}

const ConfigContext = createContext(getConfig())
const RefreshConfigContext = createContext(async () => {})

// Fetches remote app-config once at startup (fire-and-forget — never blocks rendering, since a
// slow/offline network must not delay the boot screen the way the splash-timing fix already
// guards against). Screens re-render with real branding/config once it resolves; until then they
// see DEFAULT_CONFIG (nulls), which callers treat as "use the local bundled fallback".
export function ConfigProvider({ children }) {
  const [config, setConfig] = useState(getConfig())

  const refresh = useCallback(async () => {
    const next = await loadConfig()
    setConfig(next)
    applyWebBranding(next)
    return next
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return (
    <ConfigContext.Provider value={config}>
      <RefreshConfigContext.Provider value={refresh}>
        {children}
      </RefreshConfigContext.Provider>
    </ConfigContext.Provider>
  )
}

export function useAppConfig() {
  return useContext(ConfigContext)
}

// Re-fetches /app-config on demand (e.g. a "Check Again" button on the maintenance/force-update
// gate screens) and updates every useAppConfig() consumer once it resolves.
export function useRefreshConfig() {
  return useContext(RefreshConfigContext)
}
