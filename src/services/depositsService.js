import { authFetch } from './authService'

// GET /deposits — defaults to the current calendar month server-side.
export async function listDeposits() {
  const data = await authFetch('/deposits')
  return data.deposits
}
