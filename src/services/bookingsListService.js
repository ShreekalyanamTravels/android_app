import { authFetch } from './authService'

// GET /bookings — the logged-in user's real flight bookings (not the local search/checkout
// mock draft store in flightBookingService, which is a separate in-progress-booking flow).
// Each entry already carries its computed `tab` (upcoming/completed/canceled) and per-sector
// `status`, matching what /corporate/my-bookings on the web renders.
export async function listMyFlightBookings() {
  const data = await authFetch('/bookings')
  return data.bookings
}
