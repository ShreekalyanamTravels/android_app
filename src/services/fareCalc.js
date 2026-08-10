// Fare math ported verbatim from the web app's payment-details/review-booking/passenger-details
// pages (all three duplicate this logic identically) — single source of truth here instead.

// Fallback flat per-pax rates. Adults always use the real per-adult price carried from the
// selected search result (mobile always has one); child/infant fares use these tables
// unconditionally — the web app has no real fare API to price children/infants against either.
const PAX_RATE = {
  adult: { base: 1559, tax: 1720 },
  child: { base: 1159, tax: 1420 },
  infant: { base: 499, tax: 580 },
}
const INTL_PAX_RATE = {
  adult: { base: 14200, tax: 4250 },
  child: { base: 11500, tax: 3500 },
  infant: { base: 2800, tax: 800 },
}

function fixedFare(rate, kind, count) {
  if (!count) return null
  const { base, tax } = rate[kind]
  return { base: base * count, tax: tax * count, total: (base + tax) * count }
}

function adultFare(rate, legPrice, count) {
  if (!count) return null
  if (legPrice) return { base: legPrice * count, tax: 0, total: legPrice * count }
  const { base, tax } = rate.adult
  return { base: base * count, tax: tax * count, total: (base + tax) * count }
}

function typeBreakdown(adult, child, infant, adults, children, infants) {
  const rows = []
  if (adult) rows.push({ type: 'Adult', count: adults, perPaxBase: adult.base / adults, perPaxTax: adult.tax / adults, baseTotal: adult.base, taxTotal: adult.tax, total: adult.total })
  if (child) rows.push({ type: 'Child', count: children, perPaxBase: child.base / children, perPaxTax: child.tax / children, baseTotal: child.base, taxTotal: child.tax, total: child.total })
  if (infant) rows.push({ type: 'Infant', count: infants, perPaxBase: infant.base / infants, perPaxTax: infant.tax / infants, baseTotal: infant.base, taxTotal: infant.tax, total: infant.total })
  return rows
}

// legs: [{ price }] — real per-adult price for that leg's selected fare.
export function computeLegFares({ legs, adults, children, infants, isInternational }) {
  const rate = isInternational ? INTL_PAX_RATE : PAX_RATE
  return legs.map(leg => {
    const adult = adultFare(rate, leg.price, adults)
    const child = fixedFare(rate, 'child', children)
    const infant = fixedFare(rate, 'infant', infants)
    const total = (adult?.total ?? 0) + (child?.total ?? 0) + (infant?.total ?? 0)
    return {
      adult, child, infant, total, sectorTotal: total,
      typeBreakdown: typeBreakdown(adult, child, infant, adults, children, infants),
    }
  })
}

// serviceFee/gstPercentage come from GET /service-fee; convenienceFee from GET /convenience-fee
// (0 for Credit Pool). Mirrors the web app's legServiceFees split (first leg absorbs the
// rounding remainder) and per-leg GST-on-fee rounding exactly, including its rounding drift.
export function computeFlightFare({ legs, adults, children, infants, isInternational, serviceFee = 0, gstPercentage = 0, convenienceFee = 0 }) {
  const legFares = computeLegFares({ legs, adults, children, infants, isInternational })
  const totalFlightAmt = legFares.reduce((sum, lf) => sum + lf.total, 0)
  const legCount = Math.max(1, legs.length)
  const gstFor = fee => Math.round((fee * gstPercentage) / 100)
  const legServiceFees = Array.from({ length: legCount }, (_, i) => {
    const base = Math.floor(serviceFee / legCount)
    return i === 0 ? serviceFee - base * (legCount - 1) : base
  })
  const grandTotalAmt = legFares.reduce((sum, lf, i) => sum + lf.total + (legServiceFees[i] ?? 0) + gstFor(legServiceFees[i] ?? 0), 0)
  const totalPayableAmt = grandTotalAmt + convenienceFee

  return {
    legFares, legServiceFees, totalFlightAmt,
    serviceFee, gstPercentage, gstOnServiceFee: gstFor(serviceFee),
    convenienceFee, grandTotalAmt, totalPayableAmt,
  }
}
