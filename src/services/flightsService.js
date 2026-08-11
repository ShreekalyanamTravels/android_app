import { apiFetch } from './apiClient'
import { AIRPORTS, SAVED_TRAVELLERS } from '../data/flightsData'

export const TRIP_TYPE_CODE = { oneway: 'O', roundtrip: 'R', multicity: 'M' }

// legs: [{ from, to, date }] — from/to are AIRPORTS codes, date is 'dd/mm/yyyy' (matches what
// search.jsx already produces via formatPickerDate). Extracted from searchFlights() so results.jsx
// can rebuild the exact same query string at "Book now" time (needed as `origSearch` by the
// booking flow's price-check calls) without re-issuing the search.
export function buildFlightSearchQuery({ tripType, legs, adults, children, infants, cabinClass, fareType = '1' }) {
  const qs = new URLSearchParams()
  qs.set('type', TRIP_TYPE_CODE[tripType] || 'O')
  qs.set('no_segments', String(legs.length))
  for (let i = 0; i < adults; i++) qs.append('travelers[]', 'ADT')
  qs.set('adults', String(adults))
  qs.set('childs', String(children))
  qs.set('infants', String(infants))
  qs.set('class', cabinClass)
  qs.set('fare_type', fareType)

  for (const leg of legs) {
    const from = AIRPORTS[leg.from]
    const to = AIRPORTS[leg.to]
    qs.append('departure[]', leg.date)
    qs.append('origin_country[]', from?.country || 'IN')
    qs.append('destination_country[]', to?.country || 'IN')
    qs.append('from_city[]', `${from?.city || leg.from} (${leg.from})`)
    qs.append('to_city[]', `${to?.city || leg.to} (${leg.to})`)
  }

  return qs.toString()
}

export async function searchFlights(params) {
  return apiFetch(`/flights/search?${buildFlightSearchQuery(params)}`)
}

// Flattens /flights/search-city's nested { airports: [{ flight: [...] }] } shape into a flat,
// deduped list of { code, city, airport, country } — one entry per real airport code.
export async function searchCities(query) {
  const key = query?.trim()
  if (!key) return []

  const data = await apiFetch(`/flights/search-city?key=${encodeURIComponent(key)}`)
  const seen = new Map()
  for (const entry of data.airports || []) {
    for (const f of entry.flight || []) {
      if (!f.ac || seen.has(f.ac)) continue
      seen.set(f.ac, { code: f.ac, city: f.ct, airport: f.an, country: f.cc })
    }
  }
  return [...seen.values()]
}

export async function listAirports() {
  return Promise.resolve(Object.values(AIRPORTS))
}

export async function listSavedTravellers() {
  return Promise.resolve(SAVED_TRAVELLERS)
}

export function extractAirportCode(label) {
  const m = /\(([^)]+)\)/.exec(label || '')
  return m ? m[1] : (label || '')
}

// dep is 'HH:MM'; overflow past midnight (dep-minutes + duration >= 24h) means the arrival lands
// on a later calendar day than departure.
export function arrivalDayOffset(dep, durMin) {
  const [h, m] = (dep || '0:0').split(':').map(Number)
  return Math.floor(((h * 60 + m) + (durMin || 0)) / 1440)
}

// Converts a raw /flights/search result (optionally with one of its fareOptions selected via the
// fare sheet) into the flight shape the rest of the booking flow — passenger/review/confirmation
// screens — already expects, so those screens don't need to change for the real API's field names.
// Shared between app/results.jsx (domestic + multi-city) and app/results-international.jsx —
// keeping one implementation avoids the two screens' booking payloads silently drifting apart.
export function normalizeFlight(raw, fareOption) {
  const fare = fareOption || raw.fareOptions?.[0] || {}
  const stopCount = raw.stops || 0
  const layoverCode = stopCount > 0 ? extractAirportCode(raw.segments?.[0]?.to) : ''
  const dayOffset = arrivalDayOffset(raw.dep, raw.durMin)
  return {
    rawId: raw.id,
    id: fare.yatraId || raw.yatraId,
    yatraId: fare.yatraId || raw.yatraId,
    scid: raw.scid,
    supplierCode: fare.supplierCode || raw.supplierCode,
    airline: raw.airline,
    airCode: raw.airCode,
    color: raw.color,
    flightNo: (raw.segments || []).map(s => s.code).join(' / '),
    dep: raw.dep,
    arr: raw.arr,
    arrNote: dayOffset > 0 ? `+${dayOffset} day${dayOffset > 1 ? 's' : ''}` : '',
    duration: raw.dur,
    stops: stopCount === 0 ? 'Non-stop' : `${stopCount} stop${stopCount > 1 ? 's' : ''}${layoverCode ? ` · ${layoverCode}` : ''}`,
    fareType: fare.fareId || raw.fareId,
    price: fare.price ?? raw.price,
    refundable: fare.refundable ?? raw.refundable,
    cabinBaggage: fare.cabinBag || '',
    checkinBaggage: fare.checkIn || '',
    // Passthrough only — not read by the booking payload, just carried along so a screen that
    // already has the selected flight (e.g. a post-selection summary card) can render per-segment
    // detail without needing to separately track the raw search-result item.
    segments: raw.segments || [],
  }
}
