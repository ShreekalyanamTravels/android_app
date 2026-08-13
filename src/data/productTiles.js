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

// Starting state used until GET /products resolves — deliberately empty rather than guessing
// "everything's active": an optimistic guess was tried before, but real product status drifts
// (e.g. Hotels/Travel/Visa are currently inactive) and any tile that guessed wrong would flash
// in on mount and then instantly vanish once the real, different status arrived. An empty list
// just shows nothing for the brief moment before the real (fast) fetch resolves, then fills in
// once — no incorrect flash either way.
export const DEFAULT_PRODUCTS = []
