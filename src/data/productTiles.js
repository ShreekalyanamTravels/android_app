import { colors } from '../theme/tokens'

// Local presentation metadata (icon/label/route/colors) for each real backend product exposed by
// GET /products — keyed by the product's `name`, lowercased. Screens build their tile/tab list by
// mapping over the *live* products response through this table: a product with no entry here is
// skipped, and any local list that isn't driven by the products response no longer exists — so
// the tiles shown can never drift ahead of (or behind) what the backend actually offers.
export const PRODUCT_TILES = {
  flight: { key: 'flights', label: 'Flights', icon: 'plane', route: '/search', bg: colors.pinkBg, color: colors.primary },
  insurance: { key: 'insurance', label: 'Insurance', icon: 'shield-check', route: '/insurance', bg: colors.orangeBg, color: colors.label },
  hotels: { key: 'hotels', label: 'Hotels', icon: 'bed', bg: colors.pinkBg, color: colors.primary },
  travel: { key: 'travel', label: 'Travel', icon: 'briefcase', bg: colors.orangeBg, color: colors.label },
  visa: { key: 'visa', label: 'Visa', icon: 'id', bg: colors.pinkBg, color: colors.primary },
}

// Optimistic seed used until GET /products resolves — assumes everything's active (matching the
// web app's own default state), so tiles don't flash in and out of existence on first load; they
// just narrow down once the real status is known.
export const DEFAULT_PRODUCTS = [
  { name: 'Flight', status: 'active', availability: 'live' },
  { name: 'Insurance', status: 'active', availability: 'live' },
  { name: 'Hotels', status: 'active', availability: 'coming_soon' },
  { name: 'Travel', status: 'active', availability: 'coming_soon' },
  { name: 'Visa', status: 'active', availability: 'coming_soon' },
]
