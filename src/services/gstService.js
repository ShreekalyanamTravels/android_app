import { authFetch } from './authService'

// GET /gst-details — the user's saved GST companies plus the India state list (for the state
// picker), fetched together since both are needed once "I have a GST number" is ticked.
export async function listGstDetails() {
  return authFetch('/gst-details')
}

// POST /gst-details — all six fields are required server-side.
export async function createGstDetails({ companyName, registrationNo, gstNumber, pincode, stateId, address }) {
  return authFetch('/gst-details', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companyName, registrationNo, gstNumber, pincode, stateId, address }),
  })
}
