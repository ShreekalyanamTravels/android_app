import { authFetch } from './authService'
import { apiFetch } from './apiClient'

// Public — GET /flights/price. Live Yatra pricing re-check, mandatory right before payment: the
// server rejects a booking whose payload doesn't carry the `data` this returns as `flightsData`.
// Multi-leg values are comma-joined, one entry per leg, in leg order (matches the web app's
// buildLivePriceRequest — searchId is only the FIRST leg's scid).
export async function getFlightPrice({ searchId, supplierCode, flightId, price, originCountry, destinationCountry }) {
  const qs = new URLSearchParams({
    searchId, supplierCode, flightId, price: String(price), originCountry, destinationCountry,
  })
  return apiFetch(`/flights/price?${qs.toString()}`)
}

// Public — GET /service-fee. sector: 'O'|'R' (multi-city sends 'O', matching the web app —
// there's no 'M' row in the fee table). bookingType: 'domestic'|'international'.
export async function getServiceFee({ sector, bookingType, amount }) {
  const qs = new URLSearchParams({ sector, bookingType, amount: String(amount) })
  return apiFetch(`/service-fee?${qs.toString()}`)
}

// Credit Pool payment — debits the wallet/OD and creates the booking in one server transaction.
export async function createFlightBooking(payload) {
  return authFetch('/bookings/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function createFlightRazorpayOrder(amount) {
  return authFetch('/payments/razorpay/booking/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount }),
  })
}

export async function verifyFlightRazorpayPayment(payload) {
  return authFetch('/payments/razorpay/booking/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function getBookingByRef(ref) {
  return authFetch(`/bookings/${encodeURIComponent(ref)}`)
}
