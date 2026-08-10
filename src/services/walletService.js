import { authFetch } from './authService'
import { apiFetch } from './apiClient'

export async function getWalletBalance() {
  return authFetch('/wallet/balance')
}

// Public — same lookup the web /corporate/online-payment page uses (payment_mode + sector, 'O'
// as the fallback sector since a wallet recharge has no trip type of its own).
export async function getConvenienceFee(paymentMode, sector, amount) {
  const data = await apiFetch(`/convenience-fee?paymentMode=${paymentMode}&sector=${sector}&amount=${amount}`)
  return Number(data.convenienceFee) || 0
}

export async function getGstPercentage() {
  const data = await apiFetch('/gst-percentage')
  return Number(data.gstPercentage) || 0
}

export async function createRechargeOrder(amount, paymentMode) {
  return authFetch('/payments/razorpay/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, paymentMode }),
  })
}

export async function verifyRechargePayment(payload) {
  return authFetch('/payments/razorpay/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}
