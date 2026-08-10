import { useCallback, useMemo, useState } from 'react'
import { View, Text, Pressable, StyleSheet, ScrollView, RefreshControl } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from '../../src/components/Icon'
import Preloader from '../../src/components/Preloader'
import AppDrawer from '../../src/components/AppDrawer'
import { getCurrentUser } from '../../src/services/profileService'
import { listMyFlightBookings } from '../../src/services/bookingsListService'
import { listInsuranceBookings } from '../../src/services/insuranceBookingsService'
import { getWalletBalance } from '../../src/services/walletService'
import { listDeposits } from '../../src/services/depositsService'
import { listProducts } from '../../src/services/productsService'
import { unreadCount } from '../../src/services/notificationsService'
import { usePullToRefresh } from '../../src/hooks/usePullToRefresh'
import { DEFAULT_PRODUCTS } from '../../src/data/productTiles'
import { colors, spacing, radius, fonts } from '../../src/theme/tokens'

const DEFAULT_HOTELS_PRODUCT = DEFAULT_PRODUCTS.find(p => p.name.toLowerCase() === 'hotels')

const STATUS_TONE = {
  Active: { fg: colors.successColor, bg: colors.success.bg },
  Inactive: { fg: '#C24545', bg: colors.error.bg },
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

// Matches the origin/destination IATA codes the web dashboard's own isIndian() check treats as
// domestic — used to split this month's bookings into domestic/international without needing
// per-booking fare amounts (the bookings list endpoint doesn't return pricing).
const INDIAN_CODES = new Set([
  'DEL', 'BOM', 'BLR', 'MAA', 'HYD', 'CCU', 'COK', 'IXC', 'AMD', 'PNQ', 'GOI', 'VNS', 'JAI', 'LKO', 'PAT',
  'IXB', 'BBI', 'IXR', 'IXG', 'IXA', 'IXS', 'IXU', 'IXW', 'IXZ', 'VTZ', 'CJB', 'TRV', 'IDR',
  'SXR', 'IXM', 'ATQ', 'BHO', 'NAG', 'JLR', 'GAU', 'DIB', 'TEZ', 'JRH', 'HBX', 'BDQ', 'RAJ',
])

function initials(name) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function corpId(corporateId) {
  return `SK-${String(corporateId ?? '0000').padStart(4, '0')}`
}

// Sector dates come straight from the DB as dd/mm/yyyy (see booking_root.flight_depart_date).
function parseDMY(value) {
  if (!value) return null
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim())
  if (!m) return null
  const [, d, mo, y] = m
  return new Date(Number(y), Number(mo) - 1, Number(d))
}

function daysUntil(date) {
  if (!date) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  return Math.round((target - today) / 86400000)
}

// bookedOn is a pre-formatted "Thu (07/08/2026), 5:30 PM" string (see formatBookedOn in the
// backend's bookingList.ts) — the API doesn't separately return a raw booking-creation date, so
// this extracts the dd/mm/yyyy segment back out of it.
function extractBookedDate(bookedOn) {
  const m = /\((\d{2})\/(\d{2})\/(\d{4})\)/.exec(bookedOn || '')
  if (!m) return null
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]))
}

function isDomesticRoute(route) {
  return route.split('-').every(code => INDIAN_CODES.has(code.trim().toUpperCase()))
}

function formatShortDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

function buildMonthCells(year, month) {
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [bookings, setBookings] = useState([])
  const [insBookings, setInsBookings] = useState([])
  const [wallet, setWallet] = useState(null)
  const [deposits, setDeposits] = useState([])
  const [hotelsProduct, setHotelsProduct] = useState(DEFAULT_HOTELS_PRODUCT)
  const [notifCount, setNotifCount] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [calDate, setCalDate] = useState(() => { const n = new Date(); return { year: n.getFullYear(), month: n.getMonth() } })

  const loadData = useCallback(async () => {
    await Promise.all([
      getCurrentUser().then(setUser),
      listMyFlightBookings().then(setBookings).catch(() => {}),
      listInsuranceBookings().then(setInsBookings).catch(() => {}),
      getWalletBalance().then(setWallet).catch(() => {}),
      listDeposits().then(setDeposits).catch(() => {}),
      listProducts().then(products => {
        const hotels = products.find(p => p.name.toLowerCase() === 'hotels')
        if (hotels) setHotelsProduct(hotels)
      }).catch(() => {}),
      unreadCount().then(setNotifCount),
    ])
  }, [])
  const { refreshing, onRefresh } = usePullToRefresh(loadData)

  useFocusEffect(useCallback(() => { loadData() }, [loadData]))

  const nextTrip = useMemo(() => {
    const upcoming = bookings.filter(b => b.tab === 'upcoming')
    if (!upcoming.length) return null
    return [...upcoming].sort((a, b) => {
      const da = parseDMY(a.sectors[0]?.date)?.getTime() ?? Infinity
      const db = parseDMY(b.sectors[0]?.date)?.getTime() ?? Infinity
      return da - db
    })[0]
  }, [bookings])

  const activeInsurance = insBookings.filter(b => b.status === 'Active').length
  const latestBookings = bookings.slice(0, 5)

  const monthBookings = useMemo(() => {
    const now = new Date()
    return bookings.filter(b => {
      const d = extractBookedDate(b.bookedOn)
      return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
  }, [bookings])
  const domesticCount = monthBookings.filter(b => b.sectors.every(s => isDomesticRoute(s.route))).length
  const internationalCount = monthBookings.length - domesticCount

  const travelDays = useMemo(() => {
    const set = new Set()
    bookings.forEach(b => {
      b.sectors.forEach(s => {
        const d = parseDMY(s.date)
        if (d && d.getMonth() === calDate.month && d.getFullYear() === calDate.year) set.add(d.getDate())
      })
    })
    return set
  }, [bookings, calDate])

  const monthCells = useMemo(() => buildMonthCells(calDate.year, calDate.month), [calDate])
  const today = new Date()
  const isCurrentMonth = today.getFullYear() === calDate.year && today.getMonth() === calDate.month

  function shiftMonth(delta) {
    setCalDate(({ year, month }) => {
      let m = month + delta
      let y = year
      if (m < 0) { m = 11; y -= 1 }
      if (m > 11) { m = 0; y += 1 }
      return { year: y, month: m }
    })
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Preloader />
      </SafeAreaView>
    )
  }

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email?.split('@')[0] || 'there'
  const walletBalance = wallet?.displayBalance ?? 0

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => setDrawerOpen(true)} hitSlop={8}>
            <Icon name="menu" size={22} color={colors.textDark} />
          </Pressable>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(displayName)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{displayName}</Text>
            <Text style={styles.userSub}>Corporate account · ID {corpId(user.corporateId)}</Text>
          </View>
          <Pressable onPress={() => router.push('/notifications')} hitSlop={8} style={styles.bellBtn}>
            <Icon name="bell" size={19} color={colors.textDark} />
            {notifCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{notifCount > 9 ? '9+' : notifCount}</Text>
              </View>
            )}
          </Pressable>
          <Pressable onPress={() => router.push('/(tabs)/profile')} hitSlop={8}>
            <Icon name="pencil" size={15} color={colors.textFaint} />
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <StatCard icon="briefcase" value={bookings.length} label="Bookings" />
          <StatCard icon="shield-check" value={activeInsurance} label="Active Policies" />
          <View style={styles.statCard}>
            <View style={[styles.kycPill, { backgroundColor: STATUS_TONE[user.status]?.bg ?? STATUS_TONE.Inactive.bg }]}>
              <Text style={[styles.kycPillText, { color: STATUS_TONE[user.status]?.fg ?? STATUS_TONE.Inactive.fg }]}>
                {user.status === 'Active' ? 'Account Active' : 'Account Inactive'}
              </Text>
            </View>
          </View>
        </View>

        {/* Latest Bookings */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Latest Bookings</Text>
          <Pressable onPress={() => router.push('/(tabs)/bookings')}>
            <Text style={styles.viewAll}>View all</Text>
          </Pressable>
        </View>
        {latestBookings.length === 0 ? (
          <Text style={styles.emptyMuted}>No bookings yet.</Text>
        ) : latestBookings.map(b => {
          const firstRoute = b.sectors[0]?.route
          const lastRoute = b.sectors[b.sectors.length - 1]?.route
          return (
            <Pressable key={b.id} style={styles.recentRow} onPress={() => router.push('/(tabs)/bookings')}>
              <View style={styles.recentIconBox}>
                <Icon name="plane" size={14} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.recentRoute}>{firstRoute}{b.sectors.length > 1 ? ` ⇄ ${lastRoute}` : ''}</Text>
                <Text style={styles.recentSub}>{b.sectors[0]?.date} · {b.passengers[0]}</Text>
              </View>
              <Icon name="chevron-right" size={14} color={colors.textFaint} />
            </Pressable>
          )
        })}

        {/* Upcoming Trip */}
        <Text style={styles.sectionTitle}>Upcoming Trip</Text>
        {nextTrip ? (
          <Pressable style={styles.tripCard} onPress={() => router.push('/(tabs)/bookings')}>
            <View style={styles.tripTopRow}>
              <Text style={styles.tripRoute}>
                {nextTrip.sectors[0]?.route}{nextTrip.sectors.length > 1 ? ` ⇄ ${nextTrip.sectors[nextTrip.sectors.length - 1]?.route}` : ''}
              </Text>
              {(() => {
                const d = daysUntil(parseDMY(nextTrip.sectors[0]?.date))
                if (d === null || d < 0) return null
                return (
                  <View style={styles.countdownPill}>
                    <Text style={styles.countdownText}>{d === 0 ? 'Today' : `in ${d}d`}</Text>
                  </View>
                )
              })()}
            </View>
            <Text style={styles.tripDates}>
              {nextTrip.sectors[0]?.date}{nextTrip.sectors.length > 1 ? ` – ${nextTrip.sectors[nextTrip.sectors.length - 1]?.date}` : ''} · {nextTrip.passengers.length} traveller{nextTrip.passengers.length > 1 ? 's' : ''}
            </Text>
            <View style={styles.tripFooter}>
              <Text style={styles.tripPnr}>PNR {nextTrip.sectors[0]?.pnr || nextTrip.ref}</Text>
              <View style={styles.tripViewBtn}>
                <Text style={styles.tripViewBtnText}>View Details</Text>
                <Icon name="arrow-right" size={11} color={colors.primary} />
              </View>
            </View>
          </Pressable>
        ) : (
          <View style={styles.emptyTripCard}>
            <Text style={styles.emptyTripText}>No upcoming trips yet.</Text>
            <Pressable onPress={() => router.push('/search')}>
              <Text style={styles.emptyTripLink}>Search flights →</Text>
            </Pressable>
          </View>
        )}

        {/* Travel Calendar */}
        <Text style={styles.sectionTitle}>Travel Calendar</Text>
        <View style={styles.calendarCard}>
          <View style={styles.calHeaderRow}>
            <Pressable onPress={() => shiftMonth(-1)} hitSlop={8}>
              <Icon name="chevron-left" size={16} color={colors.primary} />
            </Pressable>
            <Text style={styles.calMonthLabel}>{MONTH_NAMES[calDate.month]} {calDate.year}</Text>
            <Pressable onPress={() => shiftMonth(1)} hitSlop={8}>
              <Icon name="chevron-right" size={16} color={colors.primary} />
            </Pressable>
          </View>
          <View style={styles.calWeekRow}>
            {WEEKDAYS.map((w, i) => <Text key={i} style={styles.calWeekday}>{w}</Text>)}
          </View>
          <View style={styles.calGrid}>
            {monthCells.map((d, i) => {
              const isToday = isCurrentMonth && d === today.getDate()
              const hasTravel = d !== null && travelDays.has(d)
              return (
                <View key={i} style={styles.calCell}>
                  {d !== null && (
                    <View style={[styles.calDayCircle, isToday && styles.calDayToday, hasTravel && !isToday && styles.calDayTravel]}>
                      <Text style={[styles.calDayText, (isToday || hasTravel) && styles.calDayTextOn]}>{d}</Text>
                    </View>
                  )}
                </View>
              )
            })}
          </View>
          <View style={styles.calLegendRow}>
            <View style={styles.calLegendDot} />
            <Text style={styles.calLegendText}>Travel day</Text>
          </View>
        </View>

        {/* Monthly Bookings */}
        <Text style={styles.sectionTitle}>Monthly Bookings</Text>
        <View style={styles.monthlyCard}>
          <View style={styles.monthlyTotalRow}>
            <Text style={styles.monthlyTotalLabel}>{monthBookings.length} booking{monthBookings.length === 1 ? '' : 's'} this month</Text>
          </View>
          <View style={styles.monthlySplitRow}>
            <View style={styles.monthlySplitBlock}>
              <Text style={styles.monthlySplitLabel}>DOMESTIC</Text>
              <Text style={styles.monthlySplitCount}>{domesticCount} booking{domesticCount === 1 ? '' : 's'}</Text>
            </View>
            <View style={styles.monthlySplitDivider} />
            <View style={styles.monthlySplitBlock}>
              <Text style={styles.monthlySplitLabel}>INTERNATIONAL</Text>
              <Text style={styles.monthlySplitCount}>{internationalCount} booking{internationalCount === 1 ? '' : 's'}</Text>
            </View>
          </View>
        </View>

        {/* Monthly Hotel Booking — hidden entirely while the Hotels product is inactive */}
        {hotelsProduct.status === 'active' && (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Monthly Hotel Booking</Text>
              {hotelsProduct.availability !== 'live' && (
                <View style={styles.soonBadgeSmall}>
                  <Text style={styles.soonBadgeSmallText}>Soon</Text>
                </View>
              )}
            </View>
            <View style={styles.hotelCard}>
              <View style={styles.hotelStatBlock}>
                <Text style={styles.hotelStatLabel}>No. of Bookings</Text>
                <Text style={styles.hotelStatValue}>0</Text>
              </View>
              <View style={styles.monthlySplitDivider} />
              <View style={styles.hotelStatBlock}>
                <Text style={styles.hotelStatLabel}>Amount</Text>
                <Text style={styles.hotelStatValue}>₹0</Text>
              </View>
              <Text style={styles.hotelSoonNote}>Hotel booking launching soon</Text>
            </View>
          </>
        )}

        {/* Wallet & Top-up */}
        <Text style={styles.sectionTitle}>Wallet & Top-up</Text>
        <View style={styles.walletCard}>
          <View>
            <Text style={styles.walletLabel}>Wallet balance</Text>
            <Text style={styles.walletAmount}>
              {walletBalance < 0 ? '-' : ''}₹{Math.abs(walletBalance).toLocaleString('en-IN')}
            </Text>
          </View>
          <Pressable style={styles.depositBtn} onPress={() => router.push('/wallet/recharge')}>
            <Text style={styles.depositBtnText}>+ Deposit</Text>
          </Pressable>
        </View>
        <View style={styles.topupCard}>
          <Text style={styles.topupTitle}>Recent Top-ups</Text>
          {deposits.length === 0 ? (
            <Text style={styles.emptyMuted}>No top-ups this month.</Text>
          ) : deposits.slice(0, 5).map((t, i, arr) => (
            <View key={t.id} style={[styles.topupRow, i < arr.length - 1 && styles.topupRowDivider]}>
              <Text style={styles.topupDate}>{formatShortDate(t.postedDate)} · {t.paymentType}</Text>
              <Text style={[styles.topupAmount, t.status !== 'approved' && { color: colors.textMuted }]}>
                {t.status === 'approved' ? '+ ' : t.status === 'rejected' ? '✕ ' : '⋯ '}₹{t.amount.toLocaleString('en-IN')}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <AppDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </SafeAreaView>
  )
}

function StatCard({ icon, value, label }) {
  return (
    <View style={styles.statCard}>
      <Icon name={icon} size={16} color={colors.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '600', color: colors.onDark },
  userName: { fontSize: 15.5, fontWeight: '700', color: colors.textDark },
  userSub: { fontSize: 11.5, color: colors.textMuted, marginTop: 1 },

  bellBtn: { position: 'relative' },
  bellBadge: { position: 'absolute', top: -4, right: -6, minWidth: 15, height: 15, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderWidth: 1.5, borderColor: colors.cream },
  bellBadgeText: { fontSize: 9, fontWeight: '700', color: colors.onDark },

  walletCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.primaryDark, borderRadius: radius.lg, padding: 16 },
  walletLabel: { fontSize: 11.5, color: colors.onDarkMuted },
  walletAmount: { fontSize: 20, fontWeight: '700', color: colors.onDark, marginTop: 2 },
  depositBtn: { backgroundColor: colors.accent, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 9 },
  depositBtnText: { fontSize: 12.5, fontWeight: '700', color: colors.accentText },

  topupCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12 },
  topupTitle: { fontSize: 12, fontWeight: '700', color: colors.textDark, marginBottom: 6 },
  topupRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  topupRowDivider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  topupDate: { fontSize: 12, color: colors.textMuted },
  topupAmount: { fontSize: 12, fontWeight: '700', color: colors.successColor },

  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 76 },
  statValue: { fontSize: 17, fontWeight: '700', color: colors.textDark },
  statLabel: { fontSize: 10, color: colors.textMuted, textAlign: 'center' },
  kycPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
  kycPillText: { fontSize: 10.5, fontWeight: '700' },

  sectionTitle: { fontFamily: fonts.heading, fontSize: 15, fontWeight: '500', color: colors.textDark },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  viewAll: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  soonBadgeSmall: { backgroundColor: colors.accent, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  soonBadgeSmallText: { fontSize: 10, fontWeight: '700', color: colors.accentText },

  tripCard: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.lg, padding: 14 },
  tripTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tripRoute: { fontSize: 15, fontWeight: '700', color: colors.textDark },
  countdownPill: { backgroundColor: colors.pinkBg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  countdownText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  tripDates: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  tripFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 10 },
  tripPnr: { fontSize: 11.5, color: colors.textFaint },
  tripViewBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tripViewBtnText: { fontSize: 12, fontWeight: '700', color: colors.primary },

  emptyTripCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 16, alignItems: 'center', gap: 6 },
  emptyTripText: { fontSize: 12.5, color: colors.textMuted },
  emptyTripLink: { fontSize: 12.5, fontWeight: '700', color: colors.primary },
  emptyMuted: { fontSize: 12.5, color: colors.textFaint },

  recentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 11 },
  recentIconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.pinkBg, alignItems: 'center', justifyContent: 'center' },
  recentRoute: { fontSize: 13, fontWeight: '600', color: colors.textDark },
  recentSub: { fontSize: 11, color: colors.textMuted, marginTop: 1 },

  calendarCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 14 },
  calHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  calMonthLabel: { fontSize: 13, fontWeight: '700', color: colors.textDark },
  calWeekRow: { flexDirection: 'row', marginTop: 10 },
  calWeekday: { flex: 1, textAlign: 'center', fontSize: 10.5, fontWeight: '700', color: colors.textFaint },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  calCell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 3 },
  calDayCircle: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  calDayToday: { backgroundColor: colors.primary },
  calDayTravel: { backgroundColor: colors.pinkBg },
  calDayText: { fontSize: 11.5, color: colors.textBody },
  calDayTextOn: { fontWeight: '700', color: colors.onDark },
  calLegendRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 10 },
  calLegendDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.pinkBg, borderWidth: 1.5, borderColor: colors.primary },
  calLegendText: { fontSize: 11, color: colors.textMuted },

  monthlyCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 14 },
  monthlyTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.divider },
  monthlyTotalLabel: { fontSize: 12.5, color: colors.textMuted },
  monthlySplitRow: { flexDirection: 'row', marginTop: 10 },
  monthlySplitBlock: { flex: 1, alignItems: 'center', gap: 2 },
  monthlySplitDivider: { width: 1, backgroundColor: colors.divider },
  monthlySplitLabel: { fontSize: 10, fontWeight: '700', color: colors.textFaint, letterSpacing: 0.4 },
  monthlySplitCount: { fontSize: 13, fontWeight: '700', color: colors.textDark, marginTop: 2 },

  hotelCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 14, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  hotelStatBlock: { flex: 1, alignItems: 'center' },
  hotelStatLabel: { fontSize: 10.5, color: colors.textFaint, fontWeight: '700' },
  hotelStatValue: { fontSize: 17, fontWeight: '700', color: colors.textFaint, marginTop: 3 },
  hotelSoonNote: { width: '100%', textAlign: 'center', fontSize: 11, color: colors.textFaint, marginTop: 10, borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 8 },
})
