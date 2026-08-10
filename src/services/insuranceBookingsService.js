import { authFetch } from './authService'

// GET /insurance/bookings — the logged-in user's real insurance policies.
export async function listInsuranceBookings() {
  const data = await authFetch('/insurance/bookings')
  return data.bookings
}
