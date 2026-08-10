import { useEffect, useState } from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import ThemedText from '../../src/components/ThemedText'
import Badge from '../../src/components/Badge'
import Card from '../../src/components/Card'
import DocumentRow from '../../src/components/DocumentRow'
import Preloader from '../../src/components/Preloader'
import { getBookingById } from '../../src/services/bookingsService'
import { getDocumentsForBooking } from '../../src/services/documentsService'
import { DEAL_STAGE_STYLES } from '../../src/data/bookingsData'
import { colors, spacing } from '../../src/theme/tokens'

export default function BookingDetail() {
  const { id } = useLocalSearchParams()
  const [booking, setBooking] = useState(null)
  const [documents, setDocuments] = useState([])

  useEffect(() => {
    getBookingById(id).then(setBooking)
    getDocumentsForBooking(id).then(setDocuments)
  }, [id])

  if (!booking) {
    return <Preloader />
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
      <View style={styles.headerRow}>
        <ThemedText variant="h1" style={{ flex: 1 }}>{booking.title}</ThemedText>
        <Badge label={booking.stage} tone={DEAL_STAGE_STYLES[booking.stage]} />
      </View>
      <ThemedText variant="muted" style={{ marginTop: 4 }}>{booking.ref} · {booking.destination}</ThemedText>

      <Card style={{ marginTop: spacing.lg }}>
        <Row label="Travel Dates" value={booking.dates} />
        <Row label="Nights" value={String(booking.nights)} />
        <Row label="Travellers" value={booking.pax} last />
      </Card>

      <Card style={{ marginTop: spacing.lg }}>
        <Row label="Total Price" value={`₹${booking.total.toLocaleString('en-IN')}`} />
        <Row label="Received" value={`₹${booking.received.toLocaleString('en-IN')}`} />
        <Row label="Balance Due" value={`₹${booking.balance.toLocaleString('en-IN')}`} valueColor={booking.balance > 0 ? '#a32d2d' : '#3b6d11'} last />
      </Card>

      <Card style={{ marginTop: spacing.lg, padding: 0, overflow: 'hidden' }}>
        <View style={{ padding: spacing.lg, paddingBottom: 0 }}>
          <ThemedText variant="label">Documents</ThemedText>
        </View>
        <View style={{ paddingHorizontal: spacing.lg }}>
          {documents.length === 0
            ? <ThemedText variant="muted" style={{ paddingVertical: spacing.lg }}>No documents yet.</ThemedText>
            : documents.map(doc => <DocumentRow key={doc.id} doc={doc} />)}
        </View>
      </Card>
    </ScrollView>
  )
}

function Row({ label, value, valueColor, last = false }) {
  return (
    <View style={[rowStyles.row, !last && rowStyles.divider]}>
      <ThemedText variant="muted">{label}</ThemedText>
      <ThemedText variant="bodyMedium" style={valueColor ? { color: valueColor } : undefined}>{value}</ThemedText>
    </View>
  )
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.creamAlt },
})

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
})
