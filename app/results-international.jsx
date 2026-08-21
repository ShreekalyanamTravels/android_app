import { useCallback, useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, StyleSheet, FlatList, Modal, ScrollView, ActivityIndicator, RefreshControl } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from '../src/components/Icon'
import StepProgress from '../src/components/StepProgress'
import IntlFlightCard from '../src/components/IntlFlightCard'
import IntlCombinedCard from '../src/components/IntlCombinedCard'
import { AIRPORTS, fullCityLabel } from '../src/data/flightsData'
import { createDraft } from '../src/services/flightBookingFlow'
import { searchFlights, buildFlightSearchQuery, normalizeFlight } from '../src/services/flightsService'
import { computeLegFares } from '../src/services/fareCalc'
import { usePullToRefresh } from '../src/hooks/usePullToRefresh'
import { colors, spacing, radius, fonts } from '../src/theme/tokens'

const ORANGE = '#f07820'
const ORANGE_DARK = '#e86d18'
const PINK = '#c9184a'

const TIME_SLOTS = [
  { key: '00-06', icon: '🌙', label: '00–06' },
  { key: '06-12', icon: '⚙️', label: '06–12' },
  { key: '12-18', icon: '☀️', label: '12–18' },
  { key: '18-00', icon: '🌛', label: '18–00' },
]
const SORT_OPTIONS = [
  { key: 'price', label: 'Price' },
  { key: 'depart', label: 'Depart' },
  { key: 'duration', label: 'Duration' },
]

function inTimeSlot(dep, slot) {
  const h = parseInt(dep, 10) % 24
  if (slot === '00-06') return h >= 0 && h < 6
  if (slot === '06-12') return h >= 6 && h < 12
  if (slot === '12-18') return h >= 12 && h < 18
  if (slot === '18-00') return h >= 18
  return true
}

function toggleArr(setter, val) {
  setter(arr => arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
}

// International one-way/round-trip results — search.jsx routes here instead of /results whenever
// the route touches a non-IN airport (multi-city always stays on /results, see search.jsx). Reuses
// the exact same real data flow and draft-creation logic as /results (searchFlights, normalizeFlight,
// createDraft, computeLegFares) — only the presentation is different, matching the web app's
// dedicated /corporate/results/international page's visual design.
export default function ResultsInternational() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const { tripType = 'oneway', from = '', to = '', date = '', returnDate = '', adults = '1', children = '0', infants = '0', cabinClass = 'Economy', directOnly = '' } = params
  const adultsCount = parseInt(adults, 10) || 0
  const childrenCount = parseInt(children, 10) || 0
  const infantsCount = parseInt(infants, 10) || 0
  const travellersLabel = [
    adultsCount > 0 ? `${adultsCount} Adult${adultsCount > 1 ? 's' : ''}` : '',
    childrenCount > 0 ? `${childrenCount} Child${childrenCount > 1 ? 'ren' : ''}` : '',
    infantsCount > 0 ? `${infantsCount} Infant${infantsCount > 1 ? 's' : ''}` : '',
  ].filter(Boolean).join(', ')
  const isRoundTrip = tripType === 'roundtrip'

  const legs = useMemo(() => (
    isRoundTrip ? [{ from, to, date }, { from: to, to: from, date: returnDate }] : [{ from, to, date }]
  ), [isRoundTrip, from, to, date, returnDate])

  const [activeLegIndex, setActiveLegIndex] = useState(0)
  const [selectedFlights, setSelectedFlights] = useState(() => Array(legs.length).fill(null))
  const [creating, setCreating] = useState(false)
  const [fareSheetFlight, setFareSheetFlight] = useState(null)
  const [filterModalOpen, setFilterModalOpen] = useState(false)
  const [filterStops, setFilterStops] = useState(() => directOnly ? ['nonstop'] : [])
  const [filterTime, setFilterTime] = useState([])
  const [filterAir, setFilterAir] = useState([])
  const [priceMax, setPriceMax] = useState(null)
  const [searchLegs, setSearchLegs] = useState(null)
  const [searching, setSearching] = useState(true)
  const [searchError, setSearchError] = useState('')
  const [sortBy, setSortBy] = useState('price')

  const runSearch = useCallback(() => {
    setSearchError('')
    return searchFlights({
      tripType,
      legs: legs.map(l => ({ from: l.from, to: l.to, date: l.date })),
      adults: adultsCount, children: childrenCount, infants: infantsCount, cabinClass,
    }).then(res => {
      if (!res.status) {
        setSearchError(res.msg || 'No flights found')
        setSearchLegs([])
        return
      }
      setSearchLegs(res.legs)
    }).catch(e => {
      setSearchError(e.message || 'Search failed')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const { refreshing, onRefresh } = usePullToRefresh(runSearch)

  useEffect(() => {
    let cancelled = false
    setSearching(true)
    runSearch().finally(() => { if (!cancelled) setSearching(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const listFlights = searchLegs?.[activeLegIndex]?.flights || []

  const airlineOptions = useMemo(() => [...new Set(listFlights.map(f => f.airline))], [listFlights])
  const priceBounds = useMemo(() => {
    const prices = listFlights.map(f => f.price)
    if (!prices.length) return { min: 0, max: 0 }
    return { min: Math.min(...prices), max: Math.max(...prices) }
  }, [listFlights])
  const priceStep = Math.max(100, Math.round((priceBounds.max - priceBounds.min) / 10 / 100) * 100)
  const effectivePriceMax = priceMax ?? priceBounds.max

  const filteredFlights = useMemo(() => listFlights.filter(f => {
    if (filterStops.length) {
      const key = f.stops === 0 ? 'nonstop' : 'stop'
      if (!filterStops.includes(key)) return false
    }
    if (filterTime.length && !filterTime.some(slot => inTimeSlot(f.dep, slot))) return false
    if (filterAir.length && !filterAir.includes(f.airline)) return false
    if (f.price > effectivePriceMax) return false
    return true
  }).sort((a, b) => {
    if (sortBy === 'depart') return a.dep.localeCompare(b.dep)
    if (sortBy === 'duration') return a.durMin - b.durMin
    return a.price - b.price
  }), [listFlights, filterStops, filterTime, filterAir, effectivePriceMax, sortBy])

  const hasActiveFilters = filterStops.length > 0 || filterTime.length > 0 || filterAir.length > 0 || effectivePriceMax < priceBounds.max

  function clearFilters() {
    setFilterStops([])
    setFilterTime([])
    setFilterAir([])
    setPriceMax(null)
  }

  const fromAirport = AIRPORTS[legs[0].from]
  const toAirport = AIRPORTS[legs[0].to]

  const ready = selectedFlights.length === legs.length && selectedFlights.every(Boolean)
  const total = ready
    ? Math.round(computeLegFares({
        legs: selectedFlights.map(f => ({ price: f.price })),
        adults: adultsCount, children: childrenCount, infants: infantsCount, isInternational: true,
      }).reduce((sum, lf) => sum + lf.total, 0))
    : 0

  function pick(rawFlight, fareOption) {
    setSelectedFlights(arr => {
      const next = [...arr]
      next[activeLegIndex] = normalizeFlight(rawFlight, fareOption)
      return next
    })
    const nextIndex = activeLegIndex + 1
    if (nextIndex < legs.length && !selectedFlights[nextIndex]) setActiveLegIndex(nextIndex)
  }

  useEffect(() => {
    if (searching || selectedFlights[activeLegIndex] || !listFlights.length) return
    const cheapest = [...listFlights].sort((a, b) => a.price - b.price)[0]
    pick(cheapest)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searching, activeLegIndex, listFlights])

  const fareRows = fareSheetFlight?.fareOptions || []

  function selectFare(row) {
    pick(fareSheetFlight, row)
    setFareSheetFlight(null)
  }

  async function bookNow() {
    if (!ready || creating) return
    setCreating(true)
    const origSearch = buildFlightSearchQuery({
      tripType,
      legs: legs.map(l => ({ from: l.from, to: l.to, date: l.date })),
      adults: adultsCount, children: childrenCount, infants: infantsCount, cabinClass,
    })
    const realLegs = legs.map((l, i) => {
      const f = selectedFlights[i]
      return {
        from: l.from, to: l.to,
        fromFull: fullCityLabel(l.from), toFull: fullCityLabel(l.to),
        fromCountry: AIRPORTS[l.from]?.country || 'IN', toCountry: AIRPORTS[l.to]?.country || 'IN',
        date: l.date,
        dep: f.dep, arr: f.arr, dur: f.duration, stops: f.stops,
        airline: f.airline, airCode: f.airCode, flightCode: f.flightNo,
        price: f.price, fareId: f.fareType, refundable: f.refundable,
        yatraId: f.yatraId, scid: f.scid, supplierCode: f.supplierCode,
        cabinBaggage: f.cabinBaggage, checkinBaggage: f.checkinBaggage,
      }
    })
    const draft = await createDraft({
      tripType,
      legs: realLegs,
      adults: adultsCount, children: childrenCount, infants: infantsCount,
      cabinClass, origSearch,
    })
    setCreating(false)
    router.push(`/passenger/${draft.id}`)
  }

  const tone = activeLegIndex === 1 ? 'pink' : 'orange'
  const toneColor = tone === 'pink' ? PINK : ORANGE

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Icon name="chevron-left" size={20} color={colors.onDark} />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.headerTitle}>
              {fromAirport?.city || from} <Icon name="arrow-right" size={12} color="#ffd7ad" /> {toAirport?.city || to}
              {isRoundTrip ? <> <Icon name="arrow-right" size={12} color="#f7c9d6" /> {fromAirport?.city || from}</> : null}
            </Text>
            <Text style={styles.headerSub}>
              {date}{isRoundTrip ? ` – ${returnDate}` : ''} · {travellersLabel} · {isRoundTrip ? 'Round trip' : 'One way'}
            </Text>
          </View>
          <Pressable onPress={() => setFilterModalOpen(true)} hitSlop={10} style={styles.filterBtn}>
            <Icon name="filter" size={15} color={ORANGE} />
            {hasActiveFilters && <View style={styles.filterDot} />}
          </Pressable>
        </View>
        <StepProgress step={2} style={{ marginTop: 10 }} />
        <View style={styles.badgeRow}>
          <View style={styles.intlBadge}>
            <Text style={styles.intlBadgeText}>{isRoundTrip ? 'Round Trip' : 'One Way'} · International</Text>
          </View>
          <Text style={styles.resultCount}>{filteredFlights.length} results</Text>
        </View>
      </View>

      {legs.length > 1 && (
        <View style={styles.tabRow}>
          {legs.map((leg, i) => {
            const active = activeLegIndex === i
            const flight = selectedFlights[i]
            const legTone = i === 1 ? PINK : ORANGE
            return (
              <Pressable key={i} style={[styles.tabPill, active && { borderColor: legTone, backgroundColor: `${legTone}14` }]} onPress={() => setActiveLegIndex(i)}>
                <Text style={[styles.tabLabel, { color: active ? legTone : colors.textMuted }]}>{i === 0 ? 'ONWARD' : 'RETURN'}</Text>
                <Text style={styles.tabRoute} numberOfLines={1}>{leg.from} → {leg.to}</Text>
                <Text style={styles.tabPrice} numberOfLines={1}>{flight ? `₹${flight.price.toLocaleString('en-IN')}` : 'Select flight'}</Text>
              </Pressable>
            )
          })}
        </View>
      )}

      <View style={styles.sortRow}>
        {SORT_OPTIONS.map(o => {
          const active = sortBy === o.key
          return (
            <Pressable key={o.key} style={[styles.sortPill, active && { backgroundColor: ORANGE, borderColor: ORANGE }]} onPress={() => setSortBy(o.key)}>
              <Text style={[styles.sortPillText, active && { color: colors.white }]}>{o.label}</Text>
            </Pressable>
          )
        })}
      </View>

      {searching ? (
        <View style={styles.emptyState}>
          <ActivityIndicator color={ORANGE} />
          <Text style={styles.emptyTitle}>Searching best international flights…</Text>
          <Text style={styles.emptySub}>This can take up to 20-25 seconds.</Text>
        </View>
      ) : (
      <FlatList
        data={filteredFlights}
        keyExtractor={f => String(f.id)}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ORANGE} colors={[ORANGE]} />}
        ListHeaderComponent={ready ? (
          <IntlCombinedCard
            onward={selectedFlights[0]}
            returnFlight={selectedFlights[1] || null}
            legFrom={legs[0].from}
            legTo={legs[0].to}
            retLegFrom={legs[1]?.from}
            retLegTo={legs[1]?.to}
            total={total}
            booking={creating}
            onBookNow={bookNow}
          />
        ) : null}
        ListEmptyComponent={
          searchError ? (
            <View style={styles.emptyState}>
              <Icon name="alert-triangle" size={26} color={colors.textFaint} />
              <Text style={styles.emptyTitle}>{searchError}</Text>
            </View>
          ) : listFlights.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 30 }}>✈️</Text>
              <Text style={styles.emptyTitle}>No flights found</Text>
              <Text style={styles.emptySub}>Try a different date or route.</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 30 }}>✈️</Text>
              <Text style={styles.emptyTitle}>No flights match your filters</Text>
              <Text style={styles.emptySub}>Try adjusting or clearing your filters.</Text>
              <Pressable style={styles.emptyClearBtn} onPress={clearFilters}>
                <Text style={styles.emptyClearBtnText}>Clear filters</Text>
              </Pressable>
            </View>
          )
        }
        renderItem={({ item }) => (
          <IntlFlightCard
            item={item}
            legFrom={legs[activeLegIndex].from}
            legTo={legs[activeLegIndex].to}
            tone={tone}
            selected={selectedFlights[activeLegIndex]?.rawId === item.id}
            onPress={() => pick(item)}
            onMoreFares={() => setFareSheetFlight(item)}
          />
        )}
      />
      )}

      <View style={styles.footer}>
        <View>
          <Text style={styles.footerLabel}>Total to pay</Text>
          <Text style={styles.footerPrice}>₹{total.toLocaleString('en-IN')}</Text>
        </View>
        <Pressable style={[styles.bookBtn, !ready && { opacity: 0.5 }]} onPress={bookNow} disabled={!ready}>
          <Text style={styles.bookBtnText}>{creating ? 'Please wait…' : 'Book now'}</Text>
        </Pressable>
      </View>

      <Modal visible={!!fareSheetFlight} transparent animationType="slide" onRequestClose={() => setFareSheetFlight(null)}>
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setFareSheetFlight(null)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>{fareSheetFlight?.airline} · {fareSheetFlight?.flightNo}</Text>
                <Text style={styles.sheetSub}>{fareSheetFlight?.dep} – {fareSheetFlight?.arr} · Choose a fare</Text>
              </View>
              <Pressable onPress={() => setFareSheetFlight(null)} hitSlop={10}>
                <Icon name="chevron-down" size={18} color={colors.textMuted} />
              </Pressable>
            </View>
            {fareRows.map((row, i) => (
              <Pressable
                key={row.yatraId}
                style={[styles.fareRow, i < fareRows.length - 1 && styles.fareRowDivider]}
                onPress={() => selectFare(row)}
              >
                <View style={styles.fareRowTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fareRowName}>{row.fareId}</Text>
                    {row.meal ? <Text style={styles.fareRowNote}>{row.meal}</Text> : null}
                  </View>
                  <Text style={[styles.fareRowPrice, { color: toneColor }]}>₹{row.price.toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.baggageInfoRow}>
                  <View style={styles.baggageInfoItem}>
                    <Icon name="bag-checked" size={12} color={colors.textMuted} />
                    <Text style={styles.baggageInfoTextSm}>{row.checkIn}</Text>
                  </View>
                  <View style={styles.baggageInfoItem}>
                    <Icon name="bag-cabin" size={12} color={colors.textMuted} />
                    <Text style={styles.baggageInfoTextSm}>{row.cabinBag}</Text>
                  </View>
                  <View style={[styles.refundBadge, row.refundable ? styles.refundBadgeYes : styles.refundBadgeNo]}>
                    <Text style={[styles.refundBadgeText, row.refundable ? styles.refundBadgeTextYes : styles.refundBadgeTextNo]}>
                      {row.refundable ? 'Refundable' : 'Non Refundable'}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>

      <Modal visible={filterModalOpen} transparent animationType="slide" onRequestClose={() => setFilterModalOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setFilterModalOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Filters</Text>
              <Pressable onPress={clearFilters} hitSlop={8}>
                <Text style={styles.clearFilterText}>✕ Clear filter</Text>
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 460 }}>
              <Text style={styles.filterGroupLabel}>STOPS (OUTBOUND)</Text>
              <View style={styles.stopsRow}>
                {[{ key: 'nonstop', label: 'Non-stop' }, { key: 'stop', label: '1+ Stop' }].map(s => {
                  const active = filterStops.includes(s.key)
                  return (
                    <Pressable key={s.key} style={[styles.stopPill, active && { backgroundColor: ORANGE, borderColor: ORANGE }]} onPress={() => toggleArr(setFilterStops, s.key)}>
                      <Text style={[styles.stopPillText, active && { color: colors.white }]}>{s.label}</Text>
                    </Pressable>
                  )
                })}
              </View>

              <Text style={styles.filterGroupLabel}>DEPARTURE TIME</Text>
              <View style={styles.timeGrid}>
                {TIME_SLOTS.map(t => {
                  const active = filterTime.includes(t.key)
                  return (
                    <Pressable key={t.key} style={[styles.timeSlotBtn, active && { borderColor: ORANGE, backgroundColor: `${ORANGE}14` }]} onPress={() => toggleArr(setFilterTime, t.key)}>
                      <Text style={styles.timeSlotIcon}>{t.icon}</Text>
                      <Text style={[styles.timeSlotLabel, active && { color: ORANGE }]}>{t.label}</Text>
                    </Pressable>
                  )
                })}
              </View>

              <Text style={styles.filterGroupLabel}>AIRLINES</Text>
              {airlineOptions.map(a => {
                const checked = filterAir.includes(a)
                return (
                  <Pressable key={a} style={styles.airlineRow} onPress={() => toggleArr(setFilterAir, a)}>
                    <View style={[styles.airlineCheckbox, checked && { backgroundColor: ORANGE, borderColor: ORANGE }]}>
                      {checked && <Icon name="check" size={10} color={colors.white} />}
                    </View>
                    <Text style={[styles.airlineText, checked && { color: ORANGE, fontWeight: '600' }]}>{a}</Text>
                  </Pressable>
                )
              })}

              <Text style={styles.filterGroupLabel}>MAX PRICE</Text>
              <View style={styles.priceStepperRow}>
                <Pressable style={styles.stepperBtn} onPress={() => setPriceMax(Math.max(priceBounds.min, effectivePriceMax - priceStep))}>
                  <Icon name="minus" size={13} color={ORANGE} />
                </Pressable>
                <Text style={styles.priceValue}>₹{effectivePriceMax.toLocaleString('en-IN')}</Text>
                <Pressable style={styles.stepperBtn} onPress={() => setPriceMax(Math.min(priceBounds.max, effectivePriceMax + priceStep))}>
                  <Icon name="plus" size={13} color={ORANGE} />
                </Pressable>
              </View>
              <View style={styles.priceBoundsRow}>
                <Text style={styles.priceBoundText}>₹{priceBounds.min.toLocaleString('en-IN')}</Text>
                <Text style={styles.priceBoundText}>₹{priceBounds.max.toLocaleString('en-IN')}</Text>
              </View>
            </ScrollView>

            <Pressable style={styles.applyFilterBtn} onPress={() => setFilterModalOpen(false)}>
              <Text style={styles.applyFilterBtnText}>Apply</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  header: { backgroundColor: '#7a3010', paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  headerTitle: { fontSize: 14.5, fontWeight: '500', color: colors.white },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2, textAlign: 'center' },

  badgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 },
  intlBadge: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  intlBadgeText: { fontSize: 10.5, fontWeight: '700', color: colors.white },
  resultCount: { fontSize: 11, color: 'rgba(255,255,255,0.75)' },

  tabRow: { flexDirection: 'row', gap: 8, paddingHorizontal: spacing.lg, paddingTop: 10 },
  tabPill: { flex: 1, backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, padding: 9 },
  tabLabel: { fontSize: 10.5, fontWeight: '700' },
  tabRoute: { fontSize: 11.5, fontWeight: '600', color: colors.textDark, marginTop: 2 },
  tabPrice: { fontSize: 12.5, fontWeight: '600', color: colors.textDark, marginTop: 4 },

  sortRow: { flexDirection: 'row', gap: 8, paddingHorizontal: spacing.lg, paddingVertical: 10 },
  sortPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  sortPillText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },

  modalRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(46,40,51,0.45)' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider, marginBottom: 4 },
  sheetTitle: { fontSize: 14, fontWeight: '500', color: colors.textDark },
  sheetSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },

  fareRow: { paddingVertical: 14 },
  fareRowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fareRowDivider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  fareRowName: { fontSize: 13, fontWeight: '500', color: colors.textDark },
  fareRowNote: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  fareRowPrice: { fontSize: 14, fontWeight: '700' },

  baggageInfoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.divider, flexWrap: 'wrap' },
  baggageInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  baggageInfoTextSm: { fontSize: 10.5, color: colors.textMuted },
  refundBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
  refundBadgeYes: { backgroundColor: colors.success.bg },
  refundBadgeNo: { backgroundColor: colors.error.bg },
  refundBadgeText: { fontSize: 10, fontWeight: '600' },
  refundBadgeTextYes: { color: colors.success.fg },
  refundBadgeTextNo: { color: colors.error.fg },

  footer: { backgroundColor: '#7a3010', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md + 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footerLabel: { fontSize: 11, color: 'rgba(255,255,255,0.75)' },
  footerPrice: { fontSize: 17, fontWeight: '600', color: colors.white },
  bookBtn: { backgroundColor: ORANGE, paddingHorizontal: 22, paddingVertical: 10, borderRadius: radius.pill },
  bookBtnText: { fontSize: 14, fontWeight: '600', color: colors.white },

  filterBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  filterDot: { position: 'absolute', top: 1, right: 2, width: 8, height: 8, borderRadius: 4, backgroundColor: ORANGE, borderWidth: 1.5, borderColor: colors.white },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: spacing.lg },
  emptyTitle: { fontSize: 14, fontWeight: '600', color: colors.textDark, marginTop: 10 },
  emptySub: { fontSize: 12, color: colors.textMuted, marginTop: 4, textAlign: 'center' },
  emptyClearBtn: { marginTop: 14, borderWidth: 1.3, borderColor: ORANGE, borderRadius: radius.pill, paddingHorizontal: 18, paddingVertical: 8 },
  emptyClearBtnText: { fontSize: 12.5, fontWeight: '600', color: ORANGE },

  clearFilterText: { fontSize: 11.5, fontWeight: '600', color: ORANGE },
  filterGroupLabel: { fontSize: 10.5, fontWeight: '700', color: colors.textFaint, letterSpacing: 0.5, marginTop: 16, marginBottom: 8 },

  stopsRow: { flexDirection: 'row', gap: 8 },
  stopPill: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: radius.md, borderWidth: 1.3, borderColor: colors.border, backgroundColor: colors.cream },
  stopPillText: { fontSize: 12.5, fontWeight: '600', color: colors.textMuted },

  timeGrid: { flexDirection: 'row', gap: 6 },
  timeSlotBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.md, borderWidth: 1.3, borderColor: colors.border, backgroundColor: colors.cream },
  timeSlotIcon: { fontSize: 15, marginBottom: 3 },
  timeSlotLabel: { fontSize: 9.5, fontWeight: '600', color: colors.textMuted },

  airlineRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  airlineCheckbox: { width: 17, height: 17, borderRadius: 4, borderWidth: 1.3, borderColor: colors.borderLight, alignItems: 'center', justifyContent: 'center' },
  airlineText: { fontSize: 13, color: colors.textBody },

  priceStepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  stepperBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.3, borderColor: ORANGE, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  priceValue: { fontSize: 15, fontWeight: '700', color: colors.textDark, minWidth: 90, textAlign: 'center' },
  priceBoundsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingHorizontal: 4 },
  priceBoundText: { fontSize: 10.5, color: colors.textFaint },

  applyFilterBtn: { backgroundColor: ORANGE, borderRadius: radius.pill, paddingVertical: 14, alignItems: 'center', marginTop: spacing.lg },
  applyFilterBtnText: { fontSize: 14, fontWeight: '600', color: colors.white },
})
