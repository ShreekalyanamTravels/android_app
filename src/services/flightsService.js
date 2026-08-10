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
