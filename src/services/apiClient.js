// Bootstrap default — used until (and unless) remote config overrides it via setApiBase(). Must
// stay a real, working backend URL since it's also the fallback if the config fetch itself fails.
const DEFAULT_API_BASE = 'https://corporate.shreekalyanam.com/api/v1'

let apiBase = DEFAULT_API_BASE

export function getApiBase() {
  return apiBase
}

// Same host, no /api/v1 — for static assets served from the backend's /public folder
// (e.g. /airline_icons/{code}.png), which don't live under the API path.
export function getServerOrigin() {
  return apiBase.replace(/\/api\/v1$/, '')
}

// Called once at startup (see configService.js) after fetching /app-config, so the backend can
// redirect the app to a different API host without a rebuild. A blank/missing value leaves the
// bootstrap default in place rather than pointing the app at nothing.
export function setApiBase(url) {
  if (url) apiBase = url
}

export async function apiFetch(path, { token, ...options } = {}) {
  const headers = { ...(options.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${apiBase}${path}`, { ...options, headers })
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const error = new Error(data.error || 'Request failed')
    error.status = res.status
    throw error
  }
  return data
}
