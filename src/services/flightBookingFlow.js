// In-memory draft store carrying a real flight-booking-in-progress through
// results -> passenger -> review -> payment -> confirmation. Same Map-based pattern as the mock
// it replaces (src/services/flightBookingService.js, now deleted) — the difference is every field
// on a leg is real data pulled straight from GET /flights/search (yatraId/scid/supplierCode/price
// etc.), not seeded mock flights.

let drafts = new Map()
let seq = 1

// ONWARD/RETURN wording for the classic 1-2 sector trips; numbered for multi-city (3+ sectors).
export function legLabel(totalLegs, i) {
  if (totalLegs <= 2) return i === 0 ? 'ONWARD' : 'RETURN'
  return `FLIGHT ${i + 1}`
}

export async function createDraft({ tripType, legs, adults, children, infants, cabinClass, origSearch }) {
  const isInternational = legs.some(l => l.fromCountry !== 'IN' || l.toCountry !== 'IN')
  const draft = {
    id: `dft-${seq++}`,
    tripType,
    isInternational,
    origSearch,
    legs,
    adults, children, infants,
    cabinClass,
    passengers: [],
    contact: null,
    gst: null,
    fare: null,
  }
  drafts.set(draft.id, draft)
  return draft
}

export async function getDraft(id) {
  return drafts.get(id) || null
}

function update(id, patch) {
  const draft = drafts.get(id)
  if (!draft) return Promise.resolve(null)
  Object.assign(draft, patch)
  return Promise.resolve(draft)
}

export async function setPassengers(id, passengers) {
  return update(id, { passengers })
}

export async function setContact(id, contact) {
  return update(id, { contact })
}

export async function setGst(id, gst) {
  return update(id, { gst })
}

export async function setFare(id, fare) {
  return update(id, { fare })
}
