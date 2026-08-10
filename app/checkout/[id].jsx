import { useEffect, useState } from 'react'
import { View, ScrollView, TextInput, StyleSheet, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import ThemedText from '../../src/components/ThemedText'
import Button from '../../src/components/Button'
import Card from '../../src/components/Card'
import Preloader from '../../src/components/Preloader'
import { getItineraryById } from '../../src/services/itinerariesService'
import { createBookingFromItinerary } from '../../src/services/bookingsService'
import { getCurrentUser } from '../../src/services/profileService'
import { colors, spacing, radius, fonts } from '../../src/theme/tokens'

export default function Checkout() {
  const { id } = useLocalSearchParams()
  const router = useRouter()
  const [itinerary, setItinerary] = useState(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    getItineraryById(id).then(setItinerary)
    getCurrentUser().then(u => { setName(u.name); setPhone(u.phone) })
  }, [id])

  async function confirmBooking() {
    if (!name || !phone) {
      Alert.alert('Missing details', 'Please enter your name and phone number.')
      return
    }
    setSubmitting(true)
    const booking = await createBookingFromItinerary(itinerary, { pax: `${itinerary.adults || 2} Adults` })
    setSubmitting(false)
    // Navigate directly rather than gating on an Alert button's onPress —
    // react-native-web's Alert.alert only supports a plain message, custom
    // button callbacks don't fire there, so this must not be nav-critical.
    Alert.alert('Booking Confirmed', `Your booking ${booking.ref} has been created.`)
    router.replace('/(tabs)/bookings')
  }

  if (!itinerary) {
    return <Preloader />
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
      <ThemedText variant="h2">Confirm Your Booking</ThemedText>
      <ThemedText variant="muted" style={{ marginTop: 4 }}>{itinerary.title}</ThemedText>

      <Card style={{ marginTop: spacing.lg }}>
        <ThemedText variant="label">Lead Traveller</ThemedText>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Full name"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="Phone number"
          placeholderTextColor={colors.textMuted}
          keyboardType="phone-pad"
          style={[styles.input, { marginTop: spacing.md }]}
        />
      </Card>

      <Card style={{ marginTop: spacing.lg }}>
        <View style={styles.priceRow}>
          <ThemedText variant="muted">Total Package Price</ThemedText>
          <ThemedText variant="h2" style={{ color: colors.gold }}>₹{itinerary.totalSell.toLocaleString('en-IN')}</ThemedText>
        </View>
        <ThemedText variant="muted" style={{ marginTop: spacing.sm }}>Payment is collected separately by our team — no card details are needed here yet.</ThemedText>
      </Card>

      <Button
        label={submitting ? 'Confirming…' : 'Confirm Booking'}
        onPress={confirmBooking}
        disabled={submitting}
        style={{ marginTop: spacing.xl }}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  input: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textDark,
    backgroundColor: colors.cream,
  },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
})
