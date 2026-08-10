import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from '../../src/components/Icon'
import Preloader from '../../src/components/Preloader'
import AppDrawer from '../../src/components/AppDrawer'
import { legLabel } from '../../src/services/flightBookingFlow'
import { listMyFlightBookings } from '../../src/services/bookingsListService'
import { listInsuranceBookings } from '../../src/services/insuranceBookingsService'
import { listProducts } from '../../src/services/productsService'
import { usePullToRefresh } from '../../src/hooks/usePullToRefresh'
import { PRODUCT_TILES, DEFAULT_PRODUCTS } from '../../src/data/productTiles'
import { INS_STATUS, INS_TYPE_ICON } from '../../src/data/insuranceBookingsData'
import { colors, spacing, radius, fonts } from '../../src/theme/tokens'

const STATUS_TABS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
  { key: 'canceled', label: 'Canceled' },
]

// Matches the web /corporate/my-bookings STATUS_COLOR palette.
const STATUS_STYLE = {
  Ticketed: { color: colors.successColor, bg: colors.success.bg },
  'On Hold': { color: colors.label, bg: colors.pending.bg },
  Pending: { color: '#E57C00', bg: '#FFF8E1' },
  Cancelled: { color: colors.errorColor, bg: colors.error.bg },
  Refunded: { color: '#1565C0', bg: '#E3F2FD' },
}

const TRIP_TYPE_LABEL = { 'one-way': 'One way', round: 'Round trip', multi: 'Multi city' }

// Traveller names come straight from the DB, which stores them in whatever case they were
// entered (often all-caps) — normalize to Title Case for display.
function toTitleCase(name) {
  if (!name) return name
  return name.toLowerCase().split(' ').filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
}

// Same derivation as the web page's bookingStatus() — a booking's own status is per-sector, so
// the card-level pill is computed from all of its sectors' statuses.
function bookingStatus(b) {
  const statuses = b.sectors.map(s => s.status)
  if (statuses.every(s => s === 'Ticketed')) return 'Ticketed'
  if (statuses.every(s => s === 'Cancelled')) return 'Cancelled'
  if (statuses.every(s => s === 'Refunded')) return 'Refunded'
  if (statuses.some(s => s === 'On Hold')) return 'On Hold'
  return 'Pending'
}

export default function BookingsList() {
  const [product, setProduct] = useState('flights')
  const [bookings, setBookings] = useState([])
  const [insBookings, setInsBookings] = useState([])
  const [bookingsLoading, setBookingsLoading] = useState(true)
  const [insLoading, setInsLoading] = useState(true)
  const [statusTab, setStatusTab] = useState('upcoming')
  const [search, setSearch] = useState('')
  const [prodScrollX, setProdScrollX] = useState(0)
  const [prodRowWidth, setProdRowWidth] = useState(0)
  const [prodContentWidth, setProdContentWidth] = useState(0)
  const [products, setProducts] = useState(DEFAULT_PRODUCTS)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const prodScrollRef = useRef(null)

  const loadData = useCallback(async () => {
    await Promise.all([
      listMyFlightBookings().then(setBookings).catch(() => {}).finally(() => setBookingsLoading(false)),
      listInsuranceBookings().then(setInsBookings).catch(() => {}).finally(() => setInsLoading(false)),
      listProducts().then(setProducts).catch(() => {}),
    ])
  }, [])
  const { refreshing, onRefresh } = usePullToRefresh(loadData)

  useFocusEffect(useCallback(() => {
    listMyFlightBookings().then(setBookings).catch(() => {}).finally(() => setBookingsLoading(false))
    listInsuranceBookings().then(setInsBookings).catch(() => {}).finally(() => setInsLoading(false))
  }, []))

  useEffect(() => {
    listProducts().then(setProducts).catch(() => {})
  }, [])

  // Tabs are built entirely from GET /products — an inactive product's tab doesn't render at
  // all, an active-but-not-live one renders with a "Soon" badge. Nothing here is hardcoded.
  const productTabs = useMemo(
    () => products
      .filter(p => p.status === 'active')
      .map(p => {
        const meta = PRODUCT_TILES[p.name.toLowerCase()]
        return meta ? { key: meta.key, label: meta.label, icon: meta.icon, soon: p.availability !== 'live' } : null
      })
      .filter(Boolean),
    [products]
  )

  function selectProduct(key) {
    const tab = productTabs.find(t => t.key === key)
    if (tab.soon) return
    setProduct(key)
    setStatusTab('upcoming')
  }

  const showProductScrollHint = prodContentWidth > prodRowWidth && prodScrollX + prodRowWidth < prodContentWidth - 4

  function scrollProductsForward() {
    prodScrollRef.current?.scrollTo({ x: prodScrollX + 140, animated: true })
  }

  const isIns = product === 'insurance'

  const flightsForTab = useMemo(() => bookings.filter(b => b.tab === statusTab), [bookings, statusTab])
  const insForTab = useMemo(() => insBookings.filter(b => b.tab === statusTab), [insBookings, statusTab])

  const filteredFlights = useMemo(() => {
    if (!search) return flightsForTab
    const q = search.toLowerCase()
    return flightsForTab.filter(b =>
      b.ref.toLowerCase().includes(q) ||
      b.passengers.some(p => p.toLowerCase().includes(q)) ||
      b.sectors.some(s => s.pnr?.toLowerCase().includes(q) || s.route.toLowerCase().includes(q))
    )
  }, [flightsForTab, search])

  const filteredIns = useMemo(() => {
    if (!search) return insForTab
    const q = search.toLowerCase()
    return insForTab.filter(b =>
      b.ref.toLowerCase().includes(q) ||
      b.policyNo.toLowerCase().includes(q) ||
      b.provider.toLowerCase().includes(q) ||
      b.insured.some(p => p.toLowerCase().includes(q))
    )
  }, [insForTab, search])

  const counts = STATUS_TABS.reduce((acc, t) => {
    acc[t.key] = isIns ? insBookings.filter(b => b.tab === t.key).length : bookings.filter(b => b.tab === t.key).length
    return acc
  }, {})

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={[styles.header, styles.headerRow]}>
        <Pressable onPress={() => setDrawerOpen(true)} hitSlop={8}>
          <Icon name="menu" size={22} color={colors.textDark} />
        </Pressable>
        <Text style={styles.title}>My Bookings</Text>
      </View>

      <View style={styles.productRowWrap}>
        <ScrollView
          ref={prodScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.productRow}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 6 }}
          onLayout={(e) => setProdRowWidth(e.nativeEvent.layout.width)}
          onContentSizeChange={(w) => setProdContentWidth(w)}
          onScroll={(e) => setProdScrollX(e.nativeEvent.contentOffset.x)}
          scrollEventThrottle={16}
        >
          {productTabs.map(t => {
            const active = product === t.key
            return (
              <Pressable key={t.key} style={[styles.productPill, active && styles.productPillActive]} onPress={() => selectProduct(t.key)}>
                <Icon name={t.icon} size={13} color={active ? colors.onDark : (t.soon ? colors.textFaint : colors.textMuted)} />
                <Text style={[styles.productPillText, active && styles.productPillTextActive, t.soon && { color: colors.textFaint }]}>{t.label}</Text>
                {t.soon && (
                  <View style={styles.soonBadge}>
                    <Text style={styles.soonBadgeText}>Soon</Text>
                  </View>
                )}
              </Pressable>
            )
          })}
        </ScrollView>
        {showProductScrollHint && (
          <Pressable style={styles.scrollHint} onPress={scrollProductsForward} hitSlop={6}>
            <Icon name="chevron-right" size={15} color={colors.primary} />
          </Pressable>
        )}
      </View>

      <View style={styles.statusRow}>
        {STATUS_TABS.map(t => {
          const active = statusTab === t.key
          return (
            <Pressable key={t.key} style={styles.statusTab} onPress={() => setStatusTab(t.key)}>
              <Text style={[styles.statusTabText, active && styles.statusTabTextActive]}>{t.label}</Text>
              <View style={[styles.countBadge, active && styles.countBadgeActive]}>
                <Text style={[styles.countText, active && styles.countTextActive]}>{counts[t.key]}</Text>
              </View>
              {active && <View style={styles.statusUnderline} />}
            </Pressable>
          )
        })}
      </View>

      <View style={styles.searchBar}>
        <Icon name="search" size={15} color={colors.primary} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={isIns ? 'Policy No, Name...' : 'PNR, Ref, Name...'}
          placeholderTextColor={colors.textFaint}
          style={styles.searchInput}
        />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl, gap: spacing.md }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {!isIns && (
          bookingsLoading ? (
            <Preloader fullScreen={false} label="Loading bookings…" />
          ) : filteredFlights.length === 0 ? (
            <View style={styles.emptyBox}><Text style={styles.emptyText}>No bookings found.</Text></View>
          ) : filteredFlights.map(b => {
            const st = bookingStatus(b)
            const stStyle = STATUS_STYLE[st]
            const firstRoute = b.sectors[0]?.route
            const lastRoute = b.sectors[b.sectors.length - 1]?.route
            return (
              <View key={b.id} style={styles.card}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.leadName} numberOfLines={1}>{toTitleCase(b.passengers[0])}</Text>
                  <View style={[styles.statusPill, { backgroundColor: stStyle.bg }]}>
                    <Text style={[styles.statusPillText, { color: stStyle.color }]}>{st}</Text>
                  </View>
                </View>
                <Text style={styles.tripSub}>
                  {TRIP_TYPE_LABEL[b.type] || b.type} · {firstRoute}{b.sectors.length > 1 ? ` ⇄ ${lastRoute}` : ''}
                </Text>

                <View style={styles.sectorBlock}>
                  {b.sectors.map((s, i) => (
                    <SectorLine key={i} num={s.num} label={legLabel(b.sectors.length, i)} route={s.route} date={s.date} pnr={s.pnr} />
                  ))}
                </View>

                <View style={styles.passengerBlock}>
                  {b.passengers.map((p, i) => (
                    <Text key={i} style={styles.passengerLine}>{i + 1}. {toTitleCase(p)}</Text>
                  ))}
                </View>

                <View style={styles.refRow}>
                  <Text style={styles.refLabel}>Ref No.: <Text style={styles.refValue}>{b.ref}</Text></Text>
                </View>

                <View style={styles.footer}>
                  <Text style={styles.bookedOn}>Booked On: {b.bookedOn}</Text>
                  <View style={styles.footerBtns}>
                    <Pressable style={styles.invoiceBtn}>
                      <Text style={styles.invoiceBtnText}>Invoice</Text>
                    </Pressable>
                    <Pressable style={styles.whatsappBtn}>
                      <Icon name="brand-whatsapp" size={13} color={colors.successColor} />
                    </Pressable>
                  </View>
                </View>
              </View>
            )
          })
        )}

        {isIns && (
          insLoading ? (
            <Preloader fullScreen={false} label="Loading insurance policies…" />
          ) : filteredIns.length === 0 ? (
            <View style={styles.emptyBox}><Text style={styles.emptyText}>No insurance bookings found.</Text></View>
          ) : filteredIns.map(b => {
            const stStyle = INS_STATUS[b.status]
            return (
              <View key={b.id} style={styles.card}>
                <View style={styles.cardTopRow}>
                  <Icon name={INS_TYPE_ICON[b.planType] || 'shield-check'} size={16} color={colors.primary} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.leadName} numberOfLines={1}>{toTitleCase(b.insured[0])}</Text>
                    <Text style={styles.tripSub}>{b.planType} · {b.provider}</Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: stStyle.bg }]}>
                    <Text style={[styles.statusPillText, { color: stStyle.fg }]}>{b.status}</Text>
                  </View>
                </View>

                <View style={styles.passengerBlock}>
                  {b.insured.map((p, i) => (
                    <Text key={i} style={styles.passengerLine}>{i + 1}. {toTitleCase(p)}</Text>
                  ))}
                </View>

                <View style={styles.insDetailRow}>
                  <View>
                    <Text style={styles.insDetailLabel}>SUM INSURED</Text>
                    <Text style={styles.insDetailValue}>{b.sumInsured}</Text>
                  </View>
                  <View>
                    <Text style={styles.insDetailLabel}>PREMIUM</Text>
                    <Text style={[styles.insDetailValue, { color: colors.primary }]}>₹{b.premium}</Text>
                  </View>
                  <View>
                    <Text style={styles.insDetailLabel}>COVERAGE</Text>
                    <Text style={styles.insCoverageValue}>{b.coverFrom} – {b.coverTo}</Text>
                  </View>
                </View>

                <View style={styles.refRow}>
                  <Text style={styles.refLabel}>Policy No.: <Text style={styles.refValue}>{b.policyNo}</Text></Text>
                  <Text style={[styles.refLabel, { marginTop: 3 }]}>Ref No.: <Text style={styles.refValue}>{b.ref}</Text></Text>
                </View>

                <View style={styles.footer}>
                  <Text style={styles.bookedOn}>Booked On: {b.bookedOn}</Text>
                  <View style={styles.footerBtns}>
                    <Pressable style={styles.invoiceBtn}>
                      <Text style={styles.invoiceBtnText}>Download Policy</Text>
                    </Pressable>
                    <Pressable style={styles.whatsappBtn}>
                      <Icon name="brand-whatsapp" size={13} color={colors.successColor} />
                    </Pressable>
                  </View>
                </View>
              </View>
            )
          })
        )}
      </ScrollView>

      <AppDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </SafeAreaView>
  )
}

function SectorLine({ num, label, route, date, pnr }) {
  return (
    <View style={styles.sectorLine}>
      <Text style={styles.sectorNum}>{num}</Text>
      <Text style={styles.sectorLabel}>{label}</Text>
      <Text style={styles.sectorRoute}>{route}</Text>
      <Text style={styles.sectorDate}>{date}</Text>
      <Text style={styles.sectorPnr}>{pnr}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { fontFamily: fonts.heading, fontSize: 19, fontWeight: '500', color: colors.textDark },

  productRowWrap: { position: 'relative', marginBottom: spacing.sm },
  productRow: { flexGrow: 0 },
  productPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  productPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  productPillText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  productPillTextActive: { color: colors.onDark },
  soonBadge: { backgroundColor: colors.accent, borderRadius: radius.pill, paddingHorizontal: 5, paddingVertical: 1 },
  soonBadgeText: { fontSize: 8.5, fontWeight: '700', color: colors.accentText },
  scrollHint: {
    position: 'absolute', right: 0, top: 0, bottom: 0, width: 30,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(250,245,236,0.9)',
  },

  statusRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.divider },
  statusTab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, marginRight: 20, position: 'relative' },
  statusTabText: { fontSize: 12.5, fontWeight: '500', color: colors.textMuted },
  statusTabTextActive: { color: colors.primary, fontWeight: '700' },
  countBadge: { minWidth: 17, height: 17, borderRadius: 9, backgroundColor: colors.divider, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  countBadgeActive: { backgroundColor: colors.primary },
  countText: { fontSize: 10, fontWeight: '700', color: colors.textMuted },
  countTextActive: { color: colors.onDark },
  statusUnderline: { position: 'absolute', bottom: -1, left: 0, right: 20, height: 2.5, backgroundColor: colors.primary, borderRadius: 2 },

  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 9, marginHorizontal: spacing.lg, marginTop: spacing.md },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: colors.textDark, padding: 0 },

  emptyBox: { alignItems: 'center', paddingVertical: 50, backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  emptyText: { fontSize: 13, color: colors.textFaint },

  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 14 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  leadName: { flex: 1, fontSize: 14.5, fontWeight: '700', color: colors.textDark },
  statusPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  tripSub: { fontSize: 11.5, color: colors.textMuted, marginTop: 2 },

  sectorBlock: { marginTop: 10, borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 8, gap: 4 },
  sectorLine: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  sectorNum: { fontSize: 11, color: colors.textFaint, width: 12 },
  sectorLabel: { fontSize: 11.5, fontWeight: '600', color: colors.primary, width: 52 },
  sectorRoute: { fontSize: 12.5, fontWeight: '500', color: colors.textDark },
  sectorDate: { fontSize: 11.5, color: colors.textMuted },
  sectorPnr: { fontSize: 11, color: colors.textFaint, marginLeft: 'auto' },

  passengerBlock: { marginTop: 8, borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 8, gap: 4 },
  passengerLine: { fontSize: 12.5, color: colors.textBody },

  insDetailRow: { flexDirection: 'row', gap: 20, marginTop: 8, borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 8 },
  insDetailLabel: { fontSize: 10, fontWeight: '700', color: colors.textFaint, letterSpacing: 0.4, marginBottom: 2 },
  insDetailValue: { fontSize: 13, fontWeight: '700', color: colors.textDark },
  insCoverageValue: { fontSize: 12, color: colors.textBody },

  refRow: { marginTop: 8 },
  refLabel: { fontSize: 12, color: colors.textMuted },
  refValue: { fontWeight: '700', color: colors.textDark },

  footer: { marginTop: 10, borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 10, gap: 8 },
  bookedOn: { fontSize: 11, color: colors.textFaint },
  footerBtns: { flexDirection: 'row', gap: 8 },
  invoiceBtn: { flex: 1, borderWidth: 1.3, borderColor: colors.primary, borderRadius: radius.sm, paddingVertical: 7, alignItems: 'center' },
  invoiceBtnText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  whatsappBtn: { width: 34, borderWidth: 1.3, borderColor: colors.successColor, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
})
