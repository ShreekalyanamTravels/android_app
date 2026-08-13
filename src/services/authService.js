import AsyncStorage from '@react-native-async-storage/async-storage'
import { apiFetch } from './apiClient'

const STORAGE_KEY = 'auth_session'

let session = null // { accessToken, refreshToken, expiresIn, user }
let refreshing = null // in-flight refresh promise, shared across concurrent 401s (see refresh())

function persist() {
  if (session) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session)).catch(() => {})
  else AsyncStorage.removeItem(STORAGE_KEY).catch(() => {})
}

// Call once at app startup, before relying on isAuthenticated()/getCurrentUser() — restores a
// session persisted from a previous launch (or the last Fast Refresh, which otherwise wipes the
// in-memory `session` variable on every dev-mode code edit) so the user isn't bounced back to the
// login screen constantly during normal use.
export async function restoreSession() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (raw) session = JSON.parse(raw)
  } catch {
    session = null
  }
}

export function isAuthenticated() {
  return session !== null
}

export function getAccessToken() {
  return session?.accessToken ?? null
}

export function getCurrentUser() {
  return session?.user ?? null
}

function applySession(data) {
  session = {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresIn: data.expiresIn,
    user: data.user,
  }
  persist()
  return session.user
}

export async function login(email, password) {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (data.user?.status !== 'Active') {
    throw new Error('You are not active, please contact admin')
  }

  return applySession(data)
}

// OTP login — mobile number + 6-digit SMS code, bearer-token counterpart of the web app's
// cookie-session /api/auth/login/mobile/* flow (see frontend/app/api/v1/auth/login/mobile/*).
export async function sendLoginOtp(mobile) {
  return apiFetch('/auth/login/mobile/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile }),
  })
}

export async function verifyLoginOtp(mobile, otp) {
  const data = await apiFetch('/auth/login/mobile/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile, otp }),
  })

  if (data.user?.status !== 'Active') {
    throw new Error('You are not active, please contact admin')
  }

  return applySession(data)
}

export async function forgotPassword(email) {
  return apiFetch('/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
}

export async function changePassword(currentPassword, newPassword) {
  return authFetch('/profile/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  })
}

export async function logout() {
  const refreshToken = session?.refreshToken
  session = null
  persist()
  if (refreshToken) {
    await apiFetch('/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => {})
  }
  return true
}

// Refresh tokens are single-use (rotated on refresh), so this both gets a new access token and
// replaces the stored refresh token with the new one. Concurrent callers share one in-flight
// request — two independent /auth/refresh calls with the same (about-to-rotate) token would make
// the second one fail with "reuse detected" and wipe a session that's actually still valid.
export async function refresh() {
  if (!session?.refreshToken) throw new Error('No session to refresh')
  if (refreshing) return refreshing

  refreshing = (async () => {
    try {
      const data = await apiFetch('/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      })
      session = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresIn: data.expiresIn,
        user: data.user,
      }
      persist()
      return session.accessToken
    } finally {
      refreshing = null
    }
  })()

  return refreshing
}

// Attaches the current access token to an apiFetch call; on a 401 (access token expired — they're
// 15 minutes) refreshes once and retries. If the refresh itself fails (refresh token
// expired/revoked), the session is cleared so isAuthenticated() reflects reality.
export async function authFetch(path, options = {}) {
  try {
    return await apiFetch(path, { ...options, token: getAccessToken() })
  } catch (e) {
    if (e.status !== 401 || !session?.refreshToken) throw e
    try {
      await refresh()
    } catch {
      session = null
      persist()
      throw e
    }
    return apiFetch(path, { ...options, token: getAccessToken() })
  }
}
