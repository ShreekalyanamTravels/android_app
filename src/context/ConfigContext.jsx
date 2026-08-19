import { createContext, useContext, useEffect, useState } from 'react'
import { getConfig, loadConfig } from '../services/configService'

const ConfigContext = createContext(getConfig())

// Fetches remote app-config once at startup (fire-and-forget — never blocks rendering, since a
// slow/offline network must not delay the boot screen the way the splash-timing fix already
// guards against). Screens re-render with real branding/config once it resolves; until then they
// see DEFAULT_CONFIG (nulls), which callers treat as "use the local bundled fallback".
export function ConfigProvider({ children }) {
  const [config, setConfig] = useState(getConfig())

  useEffect(() => {
    loadConfig().then(setConfig)
  }, [])

  return <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>
}

export function useAppConfig() {
  return useContext(ConfigContext)
}
