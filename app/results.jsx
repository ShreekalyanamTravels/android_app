import { useCallback, useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, StyleSheet, FlatList, Modal, ScrollView, ActivityIndicator, RefreshControl } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from '../src/components/Icon'
import AirlineLogo from '../src/components/AirlineLogo'
import StepProgress from '../src/components/StepProgress'
import { AIRPORTS, fullCityLabel } from '../src/data/flightsData'
import { createDraft } from '../src/services/flightBookingFlow'
import { searchFlights, buildFlightSearchQuery, normalizeFlight, arrivalDayOffset } from '../src/services/flightsService'
import { computeLegFares } from '../src/services/fareCalc'
import { usePullToRefresh } from '../src/hooks/usePullToRefresh'
import { colors, spacing, radius, fonts } from '../src/theme/tokens'

const TIME_SLOTS = [
  { key: '00-06', icon: '🌙', label: '00–06' },
  { key: '06-12', icon: '⚙️', label: '06–12' },
  { key: '12-18', icon: '☀️', label: '12–18' },
  { key: '18-00', icon: '🌛', label: '18–00' },
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

function LegCard({ label, leg, flight, active, onPress, compact }) {
  return (
    <Pressable style={[styles.legCard, active && styles.legCardActive, compact && styles.legCardCompact]} onPress={onPress}>
      <View style={styles.legCardTopRow}>
        <View style={styles.legCardTopRowText}>
          <Text style={[styles.legLabel, { color: active ? colors.primary : colors.textMuted }]}>{label}</Text>
          <Text style={styles.legRoute} numberOfLines={1}>
            {leg.from} → {leg.to}<Text style={styles.legDate}> · {leg.date}</Text>
          </Text>
        </View>
        {flight && (
          <View style={styles.legEditPill}>
            <Icon name="pencil" size={10} color={colors.primary} />
            {!compact && <Text style={styles.legEditText}>Edit</Text>}
          </View>
        )}
      </View>
      <View style={styles.legTimeRow}>
        <Text style={styles.legTime} numberOfLines={1}>
          {flight ? `${flight.dep} – ${flight.arr}` : 'Select flight'}
          {!compact && <Text style={styles.legFareType}> {flight?.fareType || ''}</Text>}
        </Text>
        <Text style={[styles.legPrice, { color: active ? colors.primary : colors.textDark }]} numberOfLines={1}>
          {flight ? `₹${flight.price.toLocaleString('en-IN')}` : '—'}
        </Text>
      </View>
    </Pressable>
  )
}

export default function Results() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const { tripType = 'oneway', from = 'DEL', to = 'BOM', date = '', returnDate = '', adults = '1', children = '0', infants = '0', cabinClass = 'Economy', directOnly = '' } = params
  const adultsCount = parseInt(adults, 10) || 0
  const childrenCount = parseInt(children, 10) || 0
  const infantsCount = parseInt(infants, 10) || 0
  const travellersCount = adultsCount + childrenCount + infantsCount || 1
  const travellersLabel = [
    adultsCount > 0 ? `${adultsCount} Adult${adultsCount > 1 ? 's' : ''}` : '',
    childrenCount > 0 ? `${childrenCount} Child${childrenCount > 1 ? 'ren' : ''}` : '',
    infantsCount > 0 ? `${infantsCount} Infant${infantsCount > 1 ? 's' : ''}` : '',
  ].filter(Boolean).join(', ')
  const isRoundTrip = tripType === 'roundtrip'
  const isMultiCity = tripType === 'multicity'

  const legs = useMemo(() => {
    if (isMultiCity) {
      try {
        const parsed = JSON.parse(params.legs || '[]')
        if (Array.isArray(parsed) && parsed.length) return parsed
      } catch {}
      return [{ from, to, date }]
    }
    return isRoundTrip ? [{ from, to, date }, { from: to, to: from, date: returnDate }] : [{ from, to, date }]
  }, [isMultiCity, isRoundTrip, params.legs, from, to, date, returnDate])

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
  const [sortAsc, setSortAsc] = useState(true)

  const currentLeg = legs[activeLegIndex] || legs[0]

  // One search call covers every leg (the API returns a `legs` array in request order), so
  // switching activeLegIndex below just reads a different slice of the same response.
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
  }).sort((a, b) => sortAsc ? a.price - b.price : b.price - a.price), [listFlights, filterStops, filterTime, filterAir, effectivePriceMax, sortAsc])

  const hasActiveFilters = filterStops.length > 0 || filterTime.length > 0 || filterAir.length > 0 || effectivePriceMax < priceBounds.max

  function clearFilters() {
    setFilterStops([])
    setFilterTime([])
    setFilterAir([])
    setPriceMax(null)
  }

  const fromAirport = AIRPORTS[legs[0].from] || AIRPORTS.JAI
  const toAirport = AIRPORTS[legs[legs.length - 1].to] || AIRPORTS.DEL
  const routeSummary = isMultiCity
    ? legs.map(leg => `${AIRPORTS[leg.from]?.code || leg.from} → ${AIRPORTS[leg.to]?.code || leg.to}`).join(' · ')
    : `${fromAirport.code} → ${toAirport.code}`

  const ready = selectedFlights.length === legs.length && selectedFlights.every(Boolean)
  const isInternational = legs.some(l => (AIRPORTS[l.from]?.country || 'IN') !== 'IN' || (AIRPORTS[l.to]?.country || 'IN') !== 'IN')
  // Flight amount only (no service fee/GST yet — those need a service-fee lookup, fetched on the
  // next screen) but uses the same real flat-rate fare math the rest of the booking flow does,
  // not a rough per-pax ratio.
  const total = ready
    ? Math.round(computeLegFares({
        legs: selectedFlights.map(f => ({ price: f.price })),
        adults: adultsCount, children: childrenCount, infants: infantsCount, isInternational,
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

  // Pre-selects the cheapest fare for the active leg once its results are in, so "Total to pay"
  // shows a real price immediately instead of ₹0 until the user taps a card. Only fires while
  // that leg has no selection yet — a manual tap (or a later re-sort) is never overridden. For a
  // round trip/multi-city this cascades leg by leg as `pick` advances activeLegIndex.
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

  function legLabel(i) {
    if (legs.length === 2 && isRoundTrip) return i === 0 ? 'ONWARD' : 'RETURN'
    return `FLIGHT ${i + 1}`
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

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Icon name="chevron-left" size={20} color={colors.onDark} />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.headerTitle}>
              {isMultiCity
                ? routeSummary
                : <>{fromAirport.city} <Icon name="arrow-right" size={12} color={colors.accent} /> {toAirport.city}</>}
            </Text>
            <Text style={styles.headerSub}>
              {isMultiCity ? legs.map(l => l.date).join(' · ') : `${date}${isRoundTrip ? ` – ${returnDate}` : ''}`} '26 · {travellersLabel} · {isMultiCity ? 'Multi city' : isRoundTrip ? 'Round trip' : 'One way'} · Economy
            </Text>
          </View>
          <Pressable onPress={() => setFilterModalOpen(true)} hitSlop={10} style={styles.filterBtn}>
            <Icon name="filter" size={15} color={colors.primary} />
            {hasActiveFilters && <View style={styles.filterDot} />}
          </Pressable>
        </View>
        <StepProgress step={2} style={{ marginTop: 10 }} />
      </View>

      {legs.length > 1 && (
        legs.length > 2 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.legRowScroll} contentContainerStyle={styles.legRowScrollContent}>
            {legs.map((leg, i) => (
              <LegCard key={i} label={legLabel(i)} leg={leg} flight={selectedFlights[i]} active={activeLegIndex === i} onPress={() => setActiveLegIndex(i)} compact />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.legRow}>
            {legs.map((leg, i) => (
              <LegCard key={i} label={legLabel(i)} leg={leg} flight={selectedFlights[i]} active={activeLegIndex === i} onPress={() => setActiveLegIndex(i)} />
            ))}
          </View>
        )
      )}

      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>{legs.length > 1 ? `${legLabel(activeLegIndex)} options` : 'Sort by'}</Text>
        <Pressable style={styles.sortPill} onPress={() => setSortAsc(v => !v)}>
          <Text style={styles.sortPillText}>Price {sortAsc ? 'Low-High' : 'High-Low'}</Text>
          <Icon name="arrow-down" size={10} color={colors.primary} style={sortAsc ? undefined : { transform: [{ rotate: '180deg' }] }} />
        </Pressable>
      </View>

      {searching ? (
        <View style={styles.emptyState}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.emptyTitle}>Searching flights…</Text>
          <Text style={styles.emptySub}>This can take up to 20-25 seconds.</Text>
        </View>
      ) : (
      <FlatList
        data={filteredFlights}
        keyExtractor={f => String(f.id)}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
        ListEmptyComponent={
          searchError ? (
            <View style={styles.emptyState}>
              <Icon name="alert-triangle" size={26} color={colors.textFaint} />
              <Text style={styles.emptyTitle}>{searchError}</Text>
            </View>
          ) : listFlights.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="plane" size={26} color={colors.textFaint} />
              <Text style={styles.emptyTitle}>No flights found</Text>
              <Text style={styles.emptySub}>Try a different date or route.</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Icon name="plane" size={26} color={colors.textFaint} />
              <Text style={styles.emptyTitle}>No flights match your filters</Text>
              <Text style={styles.emptySub}>Try adjusting or clearing your filters.</Text>
              <Pressable style={styles.emptyClearBtn} onPress={clearFilters}>
                <Text style={styles.emptyClearBtnText}>Clear filters</Text>
              </Pressable>
            </View>
          )
        }
        renderItem={({ item }) => {
          const selected = selectedFlights[activeLegIndex]?.rawId === item.id
          const cheapestFare = item.fareOptions?.[0] || {}
          const flightCode = (item.segments || []).map(s => s.code).join(' / ')
          const dayOffset = arrivalDayOffset(item.dep, item.durMin)
          const moreFares = (item.fareOptions?.length || 1) - 1
          return (
            <Pressable style={[styles.flightCard, selected && styles.flightCardSelected]} onPress={() => pick(item)}>
              <View style={styles.flightTopRow}>
                <AirlineLogo code={item.airCode} color={item.color} size={32} radius={8} />
                <View style={styles.flightDepartDetails}>
                  <Text style={styles.flightTime} numberOfLines={1}>{item.dep} <Text style={styles.flightCode}>{currentLeg.from}</Text></Text>
                  <Text style={styles.flightAirline} numberOfLines={1}>{item.airline} · {flightCode}</Text>
                </View>
                <View style={styles.flightDuration}>
                  <Text style={styles.durationText}>{item.dur}</Text>
                  <View style={styles.durationLine} />
                  <Text style={[styles.stopsText, item.stops === 0 && { color: colors.successColor }]}>{item.stopsLabel}</Text>
                </View>
                <View style={styles.flightArrivalDetails}>
                  <Text style={styles.flightTime} numberOfLines={1}>{item.arr} <Text style={styles.flightCode}>{currentLeg.to}</Text></Text>
                  {dayOffset > 0 ? <Text style={styles.arrNote} numberOfLines={1}>+{dayOffset} day{dayOffset > 1 ? 's' : ''}</Text> : <View style={{ height: 18 }} />}
                </View>
              </View>
              <View style={styles.flightBottomRow}>
                <View style={styles.fareTypeWrap}>
                  <Text style={styles.fareType}>{item.fareId}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.priceText}>₹{item.price.toLocaleString('en-IN')}</Text>
                </View>
              </View>
              <View style={styles.baggageInfoRow}>
                <View style={styles.baggageInfoItem}>
                  <Icon name="bag-checked" size={13} color={colors.textMuted} />
                  <Text style={styles.baggageInfoText}>{cheapestFare.checkIn} check-in</Text>
                </View>
                <View style={styles.baggageInfoItem}>
                  <Icon name="bag-cabin" size={13} color={colors.textMuted} />
                  <Text style={styles.baggageInfoText}>{cheapestFare.cabinBag} hand bag</Text>
                </View>
                <View style={[styles.refundBadge, item.refundable ? styles.refundBadgeYes : styles.refundBadgeNo]}>
                  <Text style={[styles.refundBadgeText, item.refundable ? styles.refundBadgeTextYes : styles.refundBadgeTextNo]}>
                    {item.refundable ? 'Refundable' : 'Non Refundable'}
                  </Text>
                </View>
              </View>
              {moreFares > 0 ? (
                <View style={{ alignItems: 'center', marginTop: 16 }}>
                  <Pressable
                    style={styles.moreFaresPillWrap}
                    onPress={(e) => { e.stopPropagation?.(); setFareSheetFlight(item) }}
                  >
                    <Text style={styles.moreFaresPill}>+{moreFares} more fares</Text>
                  </Pressable>
                </View>
              ) : null}
            </Pressable>
          )
        }}
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
                  <Text style={styles.fareRowPrice}>₹{row.price.toLocaleString('en-IN')}</Text>
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
              <Text style={styles.filterGroupLabel}>STOPS</Text>
              <View style={styles.stopsRow}>
                {[{ key: 'nonstop', label: 'Non-stop' }, { key: 'stop', label: '1+ Stop' }].map(s => {
                  const active = filterStops.includes(s.key)
                  return (
                    <Pressable key={s.key} style={[styles.stopPill, active && styles.stopPillActive]} onPress={() => toggleArr(setFilterStops, s.key)}>
                      <Text style={[styles.stopPillText, active && styles.stopPillTextActive]}>{s.label}</Text>
                    </Pressable>
                  )
                })}
              </View>

              <Text style={styles.filterGroupLabel}>DEPARTURE TIME</Text>
              <View style={styles.timeGrid}>
                {TIME_SLOTS.map(t => {
                  const active = filterTime.includes(t.key)
                  return (
                    <Pressable key={t.key} style={[styles.timeSlotBtn, active && styles.timeSlotBtnActive]} onPress={() => toggleArr(setFilterTime, t.key)}>
                      <Text style={styles.timeSlotIcon}>{t.icon}</Text>
                      <Text style={[styles.timeSlotLabel, active && styles.timeSlotLabelActive]}>{t.label}</Text>
                    </Pressable>
                  )
                })}
              </View>

              <Text style={styles.filterGroupLabel}>AIRLINES</Text>
              {airlineOptions.map(a => {
                const checked = filterAir.includes(a)
                return (
                  <Pressable key={a} style={styles.airlineRow} onPress={() => toggleArr(setFilterAir, a)}>
                    <View style={[styles.airlineCheckbox, checked && styles.airlineCheckboxChecked]}>
                      {checked && <Icon name="check" size={10} color={colors.onDark} />}
                    </View>
                    <Text style={[styles.airlineText, checked && styles.airlineTextActive]}>{a}</Text>
                  </Pressable>
                )
              })}

              <Text style={styles.filterGroupLabel}>MAX PRICE</Text>
              <View style={styles.priceStepperRow}>
                <Pressable
                  style={styles.stepperBtn}
                  onPress={() => setPriceMax(Math.max(priceBounds.min, effectivePriceMax - priceStep))}
                >
                  <Icon name="minus" size={13} color={colors.primary} />
                </Pressable>
                <Text style={styles.priceValue}>₹{effectivePriceMax.toLocaleString('en-IN')}</Text>
                <Pressable
                  style={styles.stepperBtn}
                  onPress={() => setPriceMax(Math.min(priceBounds.max, effectivePriceMax + priceStep))}
                >
                  <Icon name="plus" size={13} color={colors.primary} />
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
  header: { backgroundColor: colors.primaryDark, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  headerTitle: { fontSize: 15, fontWeight: '500', color: colors.onDark },
  headerSub: { fontSize: 11, color: colors.onDarkMuted, marginTop: 2, textAlign: 'center' },

  legRow: { flexDirection: 'row', gap: 8, paddingHorizontal: spacing.lg, paddingTop: 10 },
  legRowScroll: { flexGrow: 0, flexShrink: 0, paddingTop: 10 },
  legRowScrollContent: { gap: 8, paddingHorizontal: spacing.lg },
  legCard: { flex: 1, backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, padding: 9 },
  legCardCompact: { flexGrow: 0, flexShrink: 0, flexBasis: 190, width: 190 },
  legCardActive: { backgroundColor: colors.selectedBg, borderColor: colors.primary },
  legCardTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  legCardTopRowText: { flex: 1, minWidth: 0 },
  legLabel: { fontSize: 11, fontWeight: '500' },
  legRoute: { fontSize: 11.5, fontWeight: '600', color: colors.textDark, marginTop: 1 },
  legDate: { fontSize: 10.5, fontWeight: '400', color: colors.textMuted },
  legEditPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.pinkBg, borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 3 },
  legEditText: { fontSize: 9.5, fontWeight: '600', color: colors.primary },
  legTimeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5, gap: 6 },
  legPrice: { fontSize: 13, fontWeight: '500' },
  legTime: { fontSize: 12, color: colors.textDark, fontWeight: '500', flexShrink: 1 },
  legFareType: { fontSize: 11, color: colors.textFaint, fontWeight: '400' },

  sortRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: 10 },
  sortLabel: { fontSize: 13, fontWeight: '500', color: colors.textDark },
  sortPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 11, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  sortPillText: { fontSize: 11, fontWeight: '500', color: colors.primary },

  flightCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 14, marginBottom: 10 },
  flightCardSelected: { backgroundColor: colors.selectedBg, borderWidth: 1.5, borderColor: colors.primary },
  flightTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  flightDepartDetails: { flex: 1, minWidth: 0 },
  flightDuration: { alignItems: 'center', flexShrink: 0 },
  flightArrivalDetails: { flex: 1, minWidth: 0, alignItems: 'flex-end' },
  flightTime: { fontSize: 14, fontWeight: '600', color: colors.textDark },
  flightCode: { fontSize: 11, color: colors.textMuted, fontWeight: '400' },
  flightAirline: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  durationText: { fontSize: 11, fontWeight: '500', color: colors.textMuted },
  durationLine: { width: 50, height: 2, backgroundColor: colors.divider, borderRadius: 2, marginVertical: 4 },
  stopsText: { fontSize: 11, fontWeight: '500', color: colors.label },
  arrNote: { fontSize: 11, color: colors.textFaint, marginTop: 2 },

  flightBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.divider, marginTop: 10, paddingTop: 8 },
  fareTypeWrap: { borderLeftWidth: 3, borderLeftColor: colors.accent, paddingLeft: 8 },
  fareType: { fontSize: 12, fontWeight: '500', color: colors.primaryDark },
  seatsText: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  priceText: { fontSize: 15, fontWeight: '500', color: colors.primary },
  moreFaresPillWrap: { borderRadius: radius.pill },
  moreFaresPill: { fontSize: 11, color: colors.primary, backgroundColor: colors.pinkBg, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 4, overflow: 'hidden' },

  modalRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(46,40,51,0.45)' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider, marginBottom: 4 },
  sheetTitle: { fontSize: 14, fontWeight: '500', color: colors.textDark },
  sheetSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },

  fareRow: { paddingVertical: 14 },
  fareRowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fareRowDivider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  fareRowName: { fontSize: 13, fontWeight: '500', color: colors.primaryDark },
  fareRowNote: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  fareRowPrice: { fontSize: 14, fontWeight: '500', color: colors.textDark },

  baggageInfoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.divider, flexWrap: 'wrap' },
  baggageInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  baggageInfoText: { fontSize: 12, fontWeight: '500', color: colors.textMuted },
  baggageInfoTextSm: { fontSize: 10.5, color: colors.textMuted },
  refundBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
  refundBadgeYes: { backgroundColor: colors.success.bg },
  refundBadgeNo: { backgroundColor: colors.error.bg },
  refundBadgeText: { fontSize: 10, fontWeight: '600' },
  refundBadgeTextYes: { color: colors.success.fg },
  refundBadgeTextNo: { color: colors.error.fg },

  footer: { backgroundColor: colors.primaryDark, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md + 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footerLabel: { fontSize: 11, color: colors.onDarkMuted },
  footerPrice: { fontSize: 17, fontWeight: '500', color: colors.onDark },
  bookBtn: { backgroundColor: colors.accent, paddingHorizontal: 22, paddingVertical: 10, borderRadius: radius.pill },
  bookBtnText: { fontSize: 14, fontWeight: '500', color: colors.accentText },

  filterBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  filterDot: { position: 'absolute', top: 1, right: 2, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent, borderWidth: 1.5, borderColor: colors.white },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: spacing.lg },
  emptyTitle: { fontSize: 14, fontWeight: '600', color: colors.textDark, marginTop: 10 },
  emptySub: { fontSize: 12, color: colors.textMuted, marginTop: 4, textAlign: 'center' },
  emptyClearBtn: { marginTop: 14, borderWidth: 1.3, borderColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 18, paddingVertical: 8 },
  emptyClearBtnText: { fontSize: 12.5, fontWeight: '600', color: colors.primary },

  clearFilterText: { fontSize: 11.5, fontWeight: '600', color: colors.primary },
  filterGroupLabel: { fontSize: 10.5, fontWeight: '700', color: colors.textFaint, letterSpacing: 0.5, marginTop: 16, marginBottom: 8 },

  stopsRow: { flexDirection: 'row', gap: 8 },
  stopPill: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: radius.md, borderWidth: 1.3, borderColor: colors.border, backgroundColor: colors.cream },
  stopPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  stopPillText: { fontSize: 12.5, fontWeight: '600', color: colors.textMuted },
  stopPillTextActive: { color: colors.onDark },

  timeGrid: { flexDirection: 'row', gap: 6 },
  timeSlotBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.md, borderWidth: 1.3, borderColor: colors.border, backgroundColor: colors.cream },
  timeSlotBtnActive: { borderColor: colors.primary, backgroundColor: colors.pinkBg },
  timeSlotIcon: { fontSize: 15, marginBottom: 3 },
  timeSlotLabel: { fontSize: 9.5, fontWeight: '600', color: colors.textMuted },
  timeSlotLabelActive: { color: colors.primary },

  airlineRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  airlineCheckbox: { width: 17, height: 17, borderRadius: 4, borderWidth: 1.3, borderColor: colors.borderLight, alignItems: 'center', justifyContent: 'center' },
  airlineCheckboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  airlineText: { fontSize: 13, color: colors.textBody },
  airlineTextActive: { color: colors.primary, fontWeight: '600' },

  priceStepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  stepperBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.3, borderColor: colors.primary, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  priceValue: { fontSize: 15, fontWeight: '700', color: colors.textDark, minWidth: 90, textAlign: 'center' },
  priceBoundsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingHorizontal: 4 },
  priceBoundText: { fontSize: 10.5, color: colors.textFaint },

  applyFilterBtn: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: 14, alignItems: 'center', marginTop: spacing.lg },
  applyFilterBtnText: { fontSize: 14, fontWeight: '600', color: colors.onDark },
})
