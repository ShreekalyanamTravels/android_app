import { useEffect, useState } from 'react'
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from '../../src/components/Icon'
import Preloader from '../../src/components/Preloader'
import { getBookingByRef } from '../../src/services/bookingApi'
import { colors, spacing, radius, fonts } from '../../src/theme/tokens'
import { useAppConfig } from '../../src/context/ConfigContext'

function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

const STATUS_LABEL = {
  cancel: 'Cancelled', refund: 'Refunded', hold: 'On Hold', tick: 'Ticketed',
}
function displayStatus(status) {
  const s = (status || '').toLowerCase()
  for (const [key, label] of Object.entries(STATUS_LABEL)) if (s.includes(key)) return label
  return 'Pending'
}

const PAYMENT_MODE_LABEL = { 1: 'UPI', 2: 'Net Banking', 3: 'Credit Card', 4: 'Debit Card', 5: 'Credit Pool' }

export default function Confirmation() {
  const router = useRouter()
  const config = useAppConfig()
  const { id: ref } = useLocalSearchParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getBookingByRef(ref)
      .then(setData)
      .catch(e => setError(e.message || 'Booking not found'))
  }, [ref])

  if (error) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <Icon name="alert-triangle" size={26} color={colors.textFaint} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={[styles.filledBtn, { flex: 0, paddingHorizontal: 24 }]} onPress={() => router.replace('/(tabs)/bookings')}>
            <Text style={styles.filledBtnText}>My bookings</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  if (!data) {
    return <Preloader />
  }

  const { booking, sectors, passengers, tickets } = data
  const status = displayStatus(booking.status)

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={styles.hero}>
          <View style={styles.checkCircle}>
            <Icon name={status === 'Cancelled' ? 'alert-triangle' : 'check'} size={26} color={status === 'Cancelled' ? colors.errorColor : colors.successColor} />
          </View>
          <Text style={styles.heroTitle}>{status === 'Cancelled' ? 'Booking cancelled' : 'Booking confirmed'}</Text>
          <Text style={styles.heroSub}>Ref {booking.ref} · {status}</Text>
        </View>

        <View style={{ padding: 14, gap: 10 }}>
          {sectors.map((s, i) => (
            <SectorTicket key={s.id} label={sectors.length > 1 ? (i === 0 ? 'ONWARD' : sectors.length === 2 ? 'RETURN' : `FLIGHT ${i + 1}`) : 'FLIGHT'} sector={s} />
          ))}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Traveller{passengers.length > 1 ? 's' : ''} · {passengers.length}</Text>
            {passengers.map((p, i) => (
              <Text key={p.id} style={styles.travellerLine}>{i + 1}. {p.name}</Text>
            ))}
          </View>

          <View style={styles.actionsGrid}>
            <ActionTile icon="download" color={colors.primary} label="Ticket PDF" />
            <ActionTile icon="file-invoice" color={colors.primary} label="Invoice" />
            <ActionTile icon="brand-whatsapp" color={colors.successColor} label="WhatsApp" />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Fare summary</Text>
            <FareRow label="Flight fare" value={booking.totalFlightAmt} />
            <FareRow label="Service fee" value={booking.serviceFee} />
            <FareRow label="Convenience fee" value={booking.convenienceFee} />
            <FareRow label="Total paid" value={booking.totalPayableAmt} bold />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Payment details</Text>
            <DetailRow label="Billed by" value={config.appName || 'Shree Kalyanam'} />
            <DetailRow label="Payment reference" value={booking.paymentReferenceNo || '—'} />
            <DetailRow label="Payment mode" value={PAYMENT_MODE_LABEL[booking.paymentMode] || booking.paymentMode || '—'} />
            <DetailRow label="Payment status" value={booking.paymentStatus || '—'} />
            <DetailRow label="Paid on" value={formatDateTime(booking.createdAt)} />
            {booking.invoiceNo && <DetailRow label="Invoice no." value={booking.invoiceNo} />}
            <DetailRow label="Amount paid" value={`₹${(booking.totalPayableAmt || 0).toLocaleString('en-IN')}`} bold last />
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.outlineBtn} onPress={() => router.replace('/(tabs)/bookings')}>
          <Text style={styles.outlineBtnText}>My bookings</Text>
        </Pressable>
        <Pressable style={styles.filledBtn} onPress={() => router.replace('/search')}>
          <Text style={styles.filledBtnText}>Book another</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

function SectorTicket({ label, sector }) {
  const [from, to] = (sector.route || '-').split('-')
  return (
    <View style={styles.ticketCard}>
      <View style={styles.ticketHeader}>
        <Text style={styles.ticketHeaderText}><Icon name="plane" size={11} color={colors.primary} /> {label}</Text>
        <Text style={styles.pnrText}>PNR <Text style={{ fontWeight: '500' }}>{sector.pnr}</Text></Text>
      </View>
      <View style={styles.ticketBody}>
        <View style={styles.ticketRow}>
          <View>
            <Text style={styles.ticketCity}>{sector.originCity || from}</Text>
          </View>
          <Icon name="arrow-right" size={14} color={colors.textFaint} />
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.ticketCity}>{sector.destinationCity || to}</Text>
          </View>
        </View>
        <Text style={styles.ticketMeta}>{sector.date}</Text>
      </View>
    </View>
  )
}

function DetailRow({ label, value, bold, last }) {
  return (
    <View style={[styles.detailRow, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.detailRowLabel}>{label}</Text>
      <Text style={[styles.detailRowValue, bold && { fontWeight: '700', color: colors.textDark }]}>{value}</Text>
    </View>
  )
}

function FareRow({ label, value, bold }) {
  return (
    <View style={styles.fareRow}>
      <Text style={[styles.fareRowLabel, bold && { fontWeight: '600', color: colors.textDark }]}>{label}</Text>
      <Text style={[styles.fareRowValue, bold && { fontWeight: '700', fontSize: 14 }]}>₹{(value || 0).toLocaleString('en-IN')}</Text>
    </View>
  )
}

function ActionTile({ icon, color, label }) {
  return (
    <View style={styles.actionTile}>
      <Icon name={icon} size={17} color={color} />
      <Text style={styles.actionTileLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: 12 },
  errorText: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },

  hero: { backgroundColor: colors.primaryDark, paddingVertical: 20, alignItems: 'center' },
  checkCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.pinkBg, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { marginTop: 10, fontFamily: fonts.heading, fontSize: 17, fontWeight: '500', color: colors.onDark },
  heroSub: { marginTop: 2, fontSize: 11, color: colors.onDarkMuted },

  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 12 },
  cardTitle: { fontSize: 12, fontWeight: '500', color: colors.textDark },
  travellerLine: { fontSize: 13, color: colors.textDark, marginTop: 6 },

  ticketCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, overflow: 'hidden' },
  ticketHeader: { backgroundColor: colors.pinkBg, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ticketHeaderText: { fontSize: 11, fontWeight: '500', color: colors.primary },
  pnrText: { fontSize: 11, color: colors.primaryDark },
  ticketBody: { padding: 12 },
  ticketRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ticketCity: { fontSize: 14, fontWeight: '500', color: colors.textDark },
  ticketMeta: { marginTop: 6, fontSize: 11, color: colors.textMuted },

  actionsGrid: { flexDirection: 'row', gap: 8 },
  actionTile: { flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 10, alignItems: 'center' },
  actionTileLabel: { marginTop: 3, fontSize: 11, color: colors.textBody },

  fareRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  fareRowLabel: { fontSize: 12, color: colors.textMuted },
  fareRowValue: { fontSize: 12, color: colors.textDark },

  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.divider },
  detailRowLabel: { fontSize: 12, color: colors.textMuted },
  detailRowValue: { fontSize: 12, color: colors.textBody, maxWidth: '60%', textAlign: 'right' },

  footer: { backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border, padding: 14, flexDirection: 'row', gap: 8 },
  outlineBtn: { flex: 1, borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', paddingVertical: 10, borderRadius: radius.pill },
  outlineBtnText: { fontSize: 13, fontWeight: '500', color: colors.primary },
  filledBtn: { flex: 1, backgroundColor: colors.primary, alignItems: 'center', paddingVertical: 10, borderRadius: radius.pill },
  filledBtnText: { fontSize: 13, fontWeight: '500', color: colors.onDark },
})
