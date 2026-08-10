import { useEffect, useState } from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import ThemedText from '../../src/components/ThemedText'
import Badge from '../../src/components/Badge'
import Button from '../../src/components/Button'
import Card from '../../src/components/Card'
import Preloader from '../../src/components/Preloader'
import { getItineraryById } from '../../src/services/itinerariesService'
import { ITINERARY_STATUS_STYLES } from '../../src/data/itinerariesData'
import { colors, spacing } from '../../src/theme/tokens'

export default function ItineraryDetail() {
  const { id } = useLocalSearchParams()
  const router = useRouter()
  const [itinerary, setItinerary] = useState(null)

  useEffect(() => { getItineraryById(id).then(setItinerary) }, [id])

  if (!itinerary) {
    return <Preloader />
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
      <View style={styles.headerRow}>
        <ThemedText variant="h1" style={{ flex: 1 }}>{itinerary.title}</ThemedText>
        <Badge label={itinerary.status} tone={ITINERARY_STATUS_STYLES[itinerary.status]} />
      </View>
      <ThemedText variant="muted" style={{ marginTop: 4 }}>{itinerary.destination}</ThemedText>

      <Card style={{ marginTop: spacing.lg }}>
        <Row label="Travel Dates" value={itinerary.fromDate && itinerary.toDate ? `${itinerary.fromDate} → ${itinerary.toDate}` : 'To be confirmed'} />
        <Row label="Nights" value={String(itinerary.nights)} />
        <Row label="Hotel" value={itinerary.hotel} />
        <Row label="Meal Plan" value={itinerary.mealPlan} />
        {itinerary.airlines?.length > 0 && <Row label="Airlines" value={itinerary.airlines.join(' · ')} />}
        {itinerary.adults != null && <Row label="Travellers" value={`${itinerary.adults} Adult${itinerary.adults === 1 ? '' : 's'}${itinerary.children ? ` · ${itinerary.children} Child${itinerary.children === 1 ? '' : 'ren'}` : ''}`} last />}
      </Card>

      <Card style={{ marginTop: spacing.lg }}>
        <ThemedText variant="label">Inclusions</ThemedText>
        <View style={styles.inclRow}>
          {itinerary.inclusions.map(inc => <Badge key={inc} label={inc} tone="success" style={{ marginRight: spacing.sm, marginTop: spacing.sm }} />)}
        </View>
      </Card>

      <View style={styles.footer}>
        <ThemedText variant="muted">Total Package Price</ThemedText>
        <ThemedText variant="h1" style={{ color: colors.gold }}>₹{itinerary.totalSell.toLocaleString('en-IN')}</ThemedText>
      </View>
      <Button label="Proceed to Checkout" onPress={() => router.push(`/checkout/${itinerary.id}`)} style={{ marginTop: spacing.lg }} />
    </ScrollView>
  )
}

function Row({ label, value, last = false }) {
  return (
    <View style={[rowStyles.row, !last && rowStyles.divider]}>
      <ThemedText variant="muted">{label}</ThemedText>
      <ThemedText variant="bodyMedium">{value}</ThemedText>
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
  inclRow: { flexDirection: 'row', flexWrap: 'wrap' },
  footer: { marginTop: spacing.xl },
})
