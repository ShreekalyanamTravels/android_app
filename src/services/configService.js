import AsyncStorage from '@react-native-async-storage/async-storage'
import { apiFetch, setApiBase } from './apiClient'

const STORAGE_KEY = 'app_config'

// null branding/apiBaseUrl means "use the bundled local asset / hardcoded default" — screens
// should fall back to their local require()'d logo when these are unset.
const DEFAULT_CONFIG = {
  apiBaseUrl: null,
  branding: {
    logoUrl: null,
    loadingLogoUrl: null,
    primaryColor: null,
    backgroundColor: null,
  },
  minSupportedVersion: '1.0.0',
  forceUpdate: false,
  maintenanceMode: false,
  featureFlags: {},
}

let config = DEFAULT_CONFIG

export function getConfig() {
  return config
}

// Call once at app startup, before the boot screen renders its logo. Applies a previously-cached
// config immediately (so even the /app-config request itself goes to the last known-good API
// host), then refreshes from the network. Never throws: offline or a backend outage just means
// this launch runs on the last-cached (or bundled-default) config instead.
export async function loadConfig() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (raw) {
      config = { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
      if (config.apiBaseUrl) setApiBase(config.apiBaseUrl)
    }
  } catch {}

  try {
    const remote = await apiFetch('/app-config')
    config = { ...DEFAULT_CONFIG, ...remote }
    if (config.apiBaseUrl) setApiBase(config.apiBaseUrl)
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config)).catch(() => {})
  } catch {}

  return config
}
