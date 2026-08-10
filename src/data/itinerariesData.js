export const ITINERARY_STATUS_STYLES = {
  Draft:    'pending',
  Sent:     'info',
  Approved: 'success',
}

// One itinerary quote is generated per package when a customer taps "Build Itinerary".
// In this mock layer we keep a small seed list plus a factory for on-the-fly quotes.
export const ITINERARIES = [
  {
    id: 'it-1',
    packageId: 'pkg-goa-budget',
    title: 'Goa – Budget Getaway',
    destination: 'Goa, India',
    fromDate: '2026-08-15',
    toDate: '2026-08-20',
    nights: 5,
    hotel: 'Taj Exotica',
    mealPlan: 'MAP (B+D)',
    airlines: ['IndiGo', 'Air India'],
    inclusions: ['Flights', 'Hotel', 'Breakfast + Dinner', 'Transfers'],
    totalSell: 42400,
    status: 'Sent',
  },
]

export function buildItineraryFromPackage(pkg, { adults = 2, children = 0 } = {}) {
  const pax = adults + children
  return {
    id: `it-${pkg.id}`,
    packageId: pkg.id,
    title: pkg.title,
    destination: pkg.destination,
    fromDate: null,
    toDate: null,
    nights: pkg.nights,
    hotel: pkg.hotel.name,
    mealPlan: pkg.mealPlan,
    airlines: pkg.airlines,
    inclusions: pkg.inclusions,
    totalSell: pkg.price * Math.max(pax, 1),
    status: 'Draft',
    adults, children,
  }
}
