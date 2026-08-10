import { useEffect, useState } from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import ThemedText from '../../src/components/ThemedText'
import Badge from '../../src/components/Badge'
import Button from '../../src/components/Button'
import Card from '../../src/components/Card'
import Preloader from '../../src/components/Preloader'
import { getPackageById } from '../../src/services/packagesService'
import { createItineraryFromPackage } from '../../src/services/itinerariesService'
import { colors, spacing } from '../../src/theme/tokens'

export default function PackageDetail() {
  const { id } = useLocalSearchParams()
  const router = useRouter()
  const [pkg, setPkg] = useState(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => { getPackageById(id).then(setPkg) }, [id])

  async function buildItinerary() {
    setCreating(true)
    const itinerary = await createItineraryFromPackage(id, { adults: 2, children: 0 })
    setCreating(false)
    if (itinerary) router.push(`/itinerary/${itinerary.id}`)
  }

  if (!pkg) {
    return <Preloader />
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
      <View style={styles.hero}>
        <ThemedText variant="label" style={{ color: colors.white, opacity: 0.9 }}>{pkg.theme}</ThemedText>
      </View>

      <ThemedText variant="h1" style={{ marginTop: spacing.lg }}>{pkg.title}</ThemedText>
      <ThemedText variant="muted" style={{ marginTop: 4 }}>{pkg.destination}</ThemedText>

      <View style={styles.metaRow}>
        <Badge label={`${pkg.nights}N / ${pkg.days}D`} tone="info" />
        <Badge label={`${pkg.hotel.stars}★ ${pkg.hotel.name}`} tone="pending" />
      </View>

      <Card style={{ marginTop: spacing.lg }}>
        <ThemedText variant="label">Overview</ThemedText>
        <ThemedText variant="body" style={{ marginTop: spacing.sm }}>{pkg.overview}</ThemedText>
      </Card>

      <Card style={{ marginTop: spacing.lg }}>
        <ThemedText variant="label">Meal Plan</ThemedText>
        <ThemedText variant="bodyMedium" style={{ marginTop: spacing.sm }}>{pkg.mealPlan}</ThemedText>
        {pkg.airlines.length > 0 && (
          <>
            <ThemedText variant="label" style={{ marginTop: spacing.lg }}>Airlines</ThemedText>
            <ThemedText variant="bodyMedium" style={{ marginTop: spacing.sm }}>{pkg.airlines.join(' · ')}</ThemedText>
          </>
        )}
      </Card>

      <Card style={{ marginTop: spacing.lg }}>
        <ThemedText variant="label">Inclusions</ThemedText>
        <View style={styles.inclRow}>
          {pkg.inclusions.map(inc => <Badge key={inc} label={inc} tone="success" style={{ marginRight: spacing.sm, marginTop: spacing.sm }} />)}
        </View>
      </Card>

      <View style={styles.footer}>
        <View>
          <ThemedText variant="muted">Starting from</ThemedText>
          <ThemedText variant="h1" style={{ color: colors.gold }}>₹{pkg.price.toLocaleString('en-IN')}</ThemedText>
        </View>
      </View>
      <Button label={creating ? 'Building your quote…' : 'Build Itinerary'} onPress={buildItinerary} disabled={creating} style={{ marginTop: spacing.lg }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  hero: { height: 140, borderRadius: 14, backgroundColor: colors.sidebarDark, justifyContent: 'flex-end', padding: spacing.lg },
  metaRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  inclRow: { flexDirection: 'row', flexWrap: 'wrap' },
  footer: { marginTop: spacing.xl },
})
