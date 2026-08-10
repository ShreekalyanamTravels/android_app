import { authFetch } from './authService'

// Credit Pool payment — debits the wallet/OD and records the policy in one server transaction.
export async function purchaseInsurance(payload) {
  return authFetch('/insurance/purchase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function createInsuranceRazorpayOrder(amount) {
  return authFetch('/payments/razorpay/insurance/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount }),
  })
}

export async function verifyInsuranceRazorpayPayment(payload) {
  return authFetch('/payments/razorpay/insurance/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}
