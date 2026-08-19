// Production backend.
export const API_BASE = 'https://corporate.shreekalyanam.com/api/v1'

// Same host, no /api/v1 — for static assets served from the backend's /public folder
// (e.g. /airline_icons/{code}.png), which don't live under the API path.
export const SERVER_ORIGIN = API_BASE.replace(/\/api\/v1$/, '')

export async function apiFetch(path, { token, ...options } = {}) {
  const headers = { ...(options.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const error = new Error(data.error || 'Request failed')
    error.status = res.status
    throw error
  }
  return data
}
