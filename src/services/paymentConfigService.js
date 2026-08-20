import { authFetch } from './authService'

// Never returns/stores key_secret — that's a server-only Razorpay credential (see
// frontend/app/api/v1/payments/razorpay/config/route.ts). Only key_id (public, safe for a
// checkout widget) and display/on-off config are used here.
export async function getRazorpayConfig() {
  return authFetch('/payments/razorpay/config')
}
