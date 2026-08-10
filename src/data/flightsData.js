// Ratios of adult flight price, matching corp-shreekalyanam's PAX_RATE proportions
// (adult 1559+1720=3279, child 1159+1420=2579, infant 499+580=1079)
export const CHILD_FARE_RATIO = 2579 / 3279
export const INFANT_FARE_RATIO = 1079 / 3279

export const AIRPORTS = {
  JAI: { code: 'JAI', city: 'Jaipur', airport: 'Sanganeer', country: 'IN' },
  DEL: { code: 'DEL', city: 'New Delhi', airport: 'Indira Gandhi Intl', country: 'IN' },
  BOM: { code: 'BOM', city: 'Mumbai', airport: 'Chhatrapati Shivaji', country: 'IN' },
  SIN: { code: 'SIN', city: 'Singapore', airport: 'Changi', country: 'SG' },
  DXB: { code: 'DXB', city: 'Dubai', airport: 'Dubai Intl', country: 'AE' },
}

// Merges an airport looked up via the live /flights/search-city autosuggest into the shared
// AIRPORTS dict, so every AIRPORTS[code] lookup elsewhere (results.jsx, flightsService.js)
// resolves it too — not just the 5 seeded above.
export function registerAirport(entry) {
  AIRPORTS[entry.code] = entry
}

const COUNTRY_NAMES = {
  IN: 'India', SG: 'Singapore', AE: 'United Arab Emirates', TH: 'Thailand',
  GB: 'United Kingdom', US: 'United States', AU: 'Australia', DE: 'Germany',
  FR: 'France', JP: 'Japan', MY: 'Malaysia', LK: 'Sri Lanka', NP: 'Nepal', MV: 'Maldives',
}

// "Jaipur, India (JAI)" — the full label the booking API stores as origin_city/destination_city.
export function fullCityLabel(code) {
  const a = AIRPORTS[code]
  if (!a) return code
  return `${a.city}, ${COUNTRY_NAMES[a.country] || a.country} (${a.code})`
}

// Baggage/refundability defaults applied to every seeded flight below
const DOMESTIC_BAGGAGE = { cabinBaggage: '7 Kg', checkinBaggage: '15 Kg', refundable: false }
const INTL_FULL_SERVICE_BAGGAGE = { cabinBaggage: '7 Kg', checkinBaggage: '25 Kg', refundable: false }
const INTL_BUDGET_BAGGAGE = { cabinBaggage: '7 Kg', checkinBaggage: '20 Kg', refundable: false }

export const FLIGHTS = {
  'JAI-DEL': [
    { id: 'f1', airline: 'Alliance Air', flightNo: '9I-644', dep: '15:35', arr: '16:40', duration: '1h 5m', stops: 'Non-stop', fareType: 'Saver', seats: 30, price: 2897, moreFares: 3, ...DOMESTIC_BAGGAGE },
    { id: 'f2', airline: 'IndiGo', flightNo: '6E-6492', dep: '17:15', arr: '18:20', duration: '1h 5m', stops: 'Non-stop', fareType: 'Saver', seats: 27, price: 3489, moreFares: 4, ...DOMESTIC_BAGGAGE },
    { id: 'f3', airline: 'IndiGo', flightNo: '6E-518', dep: '09:10', arr: '10:10', duration: '1h', stops: 'Non-stop', fareType: 'Saver', seats: 20, price: 4014, moreFares: 2, ...DOMESTIC_BAGGAGE },
  ],
  'DEL-JAI': [
    { id: 'f4', airline: 'IndiGo', flightNo: '6E-2115', dep: '18:45', arr: '19:50', duration: '1h 5m', stops: 'Non-stop', fareType: 'Saver', seats: 22, price: 3105, moreFares: 2, ...DOMESTIC_BAGGAGE },
  ],
  'DEL-BOM': [
    { id: 'f5', airline: 'IndiGo', flightNo: '6E-931', dep: '19:30', arr: '00:30', arrNote: '+1 day', duration: '05h 00m', stops: '1 stop · AMD', fareType: 'Saver', seats: 30, price: 5996, moreFares: 4, ...DOMESTIC_BAGGAGE },
    { id: 'f6', airline: 'IndiGo', flightNo: '6E-2013', dep: '21:50', arr: '02:55', arrNote: '+1 day', duration: '05h 05m', stops: '1 stop · AMD', fareType: 'Saver', seats: 27, price: 5996, moreFares: 2, ...DOMESTIC_BAGGAGE },
    { id: 'f7', airline: 'Air India', flightNo: 'AI-2954', dep: '19:55', arr: '22:05', duration: '02h 10m', stops: 'Non-stop', fareType: 'Saver', seats: 12, price: 6240, moreFares: 3, ...DOMESTIC_BAGGAGE },
  ],
  'JAI-SIN': [
    { id: 'f8', airline: 'Singapore Airlines', flightNo: 'SQ-423', dep: '02:20', arr: '11:45', arrNote: '', duration: '06h 25m', stops: '1 stop · BOM', fareType: 'Value', seats: 18, price: 24760, moreFares: 3, ...INTL_FULL_SERVICE_BAGGAGE },
    { id: 'f9', airline: 'IndiGo', flightNo: '6E-1407', dep: '23:10', arr: '09:05', arrNote: '+1 day', duration: '07h 55m', stops: '1 stop · DEL', fareType: 'Saver', seats: 14, price: 21990, moreFares: 2, ...DOMESTIC_BAGGAGE },
  ],
  'SIN-JAI': [
    { id: 'f10', airline: 'Singapore Airlines', flightNo: 'SQ-424', dep: '13:05', arr: '17:50', arrNote: '', duration: '06h 45m', stops: '1 stop · BOM', fareType: 'Value', seats: 20, price: 25480, moreFares: 3, ...INTL_FULL_SERVICE_BAGGAGE },
  ],
  'JAI-DXB': [
    { id: 'f11', airline: 'Air India Express', flightNo: 'IX-192', dep: '04:15', arr: '06:05', arrNote: '', duration: '02h 50m', stops: 'Non-stop', fareType: 'Saver', seats: 24, price: 12980, moreFares: 3, ...INTL_BUDGET_BAGGAGE },
  ],
}

export function getFlights(from, to) {
  return FLIGHTS[`${from}-${to}`] || FLIGHTS['JAI-DEL']
}

const FARE_POOL = [
  { name: 'Corp Fare', delta: -150, note: 'Corporate discount · Free cancellation', refundable: true },
  { name: 'Flexi Plus', delta: 350, note: 'Free date change · Priority boarding', refundable: true },
  { name: 'Upfront', delta: 620, note: 'Seat selection · Extra baggage 5kg', refundable: false, extraCheckinKg: 5 },
  { name: 'Saver Max', delta: 180, note: 'Free meal · 1 free date change', refundable: false },
]

function bumpBaggage(weightLabel, extraKg) {
  const kg = (parseInt(weightLabel, 10) || 0) + extraKg
  return `${kg} Kg`
}

export function buildFareOptions(flight) {
  const count = flight.moreFares || 0
  return FARE_POOL.slice(0, count).map((f, i) => ({
    id: `${flight.id}-fare${i}`,
    name: f.name === 'Upfront' ? `${flight.airline} Upfront` : f.name,
    note: f.note,
    price: Math.max(flight.price + f.delta, 500),
    refundable: f.refundable,
    cabinBaggage: flight.cabinBaggage,
    checkinBaggage: f.extraCheckinKg ? bumpBaggage(flight.checkinBaggage, f.extraCheckinKg) : flight.checkinBaggage,
  }))
}

export const SAVED_TRAVELLERS = [
  { id: 't1', label: 'Sanket K.', title: 'Mr', firstName: 'Sanket Raj', lastName: 'Kulkarni', gender: 'Male', dob: '14 Mar 1992' },
  { id: 't2', label: 'Priya K.', title: 'Ms', firstName: 'Priya', lastName: 'Kulkarni', gender: 'Female', dob: '02 Aug 1994' },
  { id: 't3', label: 'Rohan M.', title: 'Mr', firstName: 'Rohan', lastName: 'Mehta', gender: 'Male', dob: '19 Nov 1990' },
]

export const CORPORATE_ACCOUNT = {
  company: 'Shree Kalyanam Pvt Ltd',
  gstin: '08AAACS1234F1Z5',
  place: 'Jaipur, RJ',
}
