import { authFetch } from './authService'
import { apiFetch } from './apiClient'

// Public — GET /insurance/plans. Real Bajaj-backed plan catalog, priced per-person/pre-GST for
// the given trip criteria (matches the web app's /corporate/insurance/plans page).
export async function getInsurancePlans({ type, dest, dep, ret, dob }) {
  const qs = new URLSearchParams({ type: type || '', dest: dest || '', dep: dep || '', ret: ret || '', dob: dob || '' })
  return apiFetch(`/insurance/plans?${qs.toString()}`)
}

// Public — GET /insurance/premium. Live eligibility + real premium re-check for one specific
// plan (Bajaj's calculatepremium webservice) — a plan that isn't actually quotable for this
// age/trip/area returns 404/502, which we treat as "not eligible" rather than an error.
export async function getInsurancePremium({ plan, dep, ret, dob, dest }) {
  const qs = new URLSearchParams({ plan: plan || '', dep: dep || '', ret: ret || '', dob: dob || '', dest: dest || '' })
  try {
    return await apiFetch(`/insurance/premium?${qs.toString()}`)
  } catch {
    return null
  }
}

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
