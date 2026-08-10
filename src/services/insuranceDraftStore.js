// In-memory draft for the insurance purchase flow (Review Policy → Proposer/Traveler forms).
// Session-only by design — cleared on resetDraft, no persistence needed for this demo flow.
let proposer = null
let travellers = {}

export function getProposer() {
  return proposer
}

export function setProposer(data) {
  proposer = data
}

export function getTraveller(index) {
  return travellers[index] || null
}

export function setTraveller(index, data) {
  travellers = { ...travellers, [index]: data }
}

export function resetDraft() {
  proposer = null
  travellers = {}
}
