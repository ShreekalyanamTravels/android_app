import { authFetch } from './authService'

export async function getCurrentUser() {
  const data = await authFetch('/profile')
  return data.profile
}
