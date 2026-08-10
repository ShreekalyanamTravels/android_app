import { useEffect, useState } from 'react'
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from '../../src/components/Icon'
import Preloader from '../../src/components/Preloader'
import { getDraft } from '../../src/services/flightBookingFlow'
import { AIRPORTS } from '../../src/data/flightsData'
import { colors, spacing, radius, fonts } from '../../src/theme/tokens'

export default function FareRules() {
  const router = useRouter()
  const { id, leg } = useLocalSearchParams()
  const [draft, setDraft] = useState(null)
  const [tab, setTab] = useState('fare')

  useEffect(() => { getDraft(id).then(setDraft) }, [id])

  if (!draft) {
    return <Preloader />
  }

  const legIndex = Math.min(Math.max(parseInt(leg, 10) || 0, 0), draft.legs.length - 1)
  const activeLeg = draft.legs[legIndex]
  const flight = activeLeg
  const from = AIRPORTS[activeLeg.from]
  const to = AIRPORTS[activeLeg.to]
  const totalPayable = draft.fare?.totalPayableAmt ?? 0

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.spacer} />
        <Text style={styles.headerTitle}>Baggage and Fare Rules</Text>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Icon name="x" size={20} color={colors.onDark} />
        </Pressable>
      </View>

      <View style={styles.tabRow}>
        <Pressable style={[styles.tabPill, tab === 'fare' && styles.tabPillActive]} onPress={() => setTab('fare')}>
          <Icon name="cash-banknote" size={15} color={tab === 'fare' ? colors.onDark : colors.textMuted} />
          <Text style={[styles.tabText, tab === 'fare' && styles.tabTextActive]}>Fare Rules</Text>
        </Pressable>
        <Pressable style={[styles.tabPill, tab === 'baggage' && styles.tabPillActive]} onPress={() => setTab('baggage')}>
          <Icon name="briefcase" size={15} color={tab === 'baggage' ? colors.onDark : colors.textMuted} />
          <Text style={[styles.tabText, tab === 'baggage' && styles.tabTextActive]}>Baggage</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        <View style={styles.routeCard}>
          <Text style={styles.routeAirline}>{flight.airline} · {flight.flightCode}</Text>
          <View style={styles.routeRow}>
            <Text style={styles.routeCity}>{from.city}</Text>
            <Icon name="arrow-right" size={12} color={colors.textDark} />
            <Text style={styles.routeCity}>{to.city}</Text>
          </View>

          <View style={styles.sectionBar}>
            <Text style={styles.sectionBarText}>{tab === 'fare' ? 'Fare Rules' : 'Baggage'}</Text>
          </View>

          {tab === 'baggage' ? (
            <View style={styles.baggageRow}>
              <View style={styles.baggageIconCol}>
                <Icon name="users" size={22} color={colors.primary} />
                <Text style={styles.baggageType}>Adults</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.baggageLine}><Text style={styles.baggageBold}>{flight.checkinBaggage || '—'}</Text> (Check-in Baggage)</Text>
                <Text style={styles.baggageLine}><Text style={styles.baggageBold}>{flight.cabinBaggage || '—'}</Text> (Cabin Baggage)</Text>
              </View>
            </View>
          ) : (
            <View style={styles.fareRuleBody}>
              <FareRuleRow label="Cancellation" value="Non-refundable · airline cancellation fee applies" />
              <FareRuleRow label="Date Change" value={`₹${flight.fareId === 'Value' ? '3,000' : '3,500'} + fare difference, per passenger`} />
              <FareRuleRow label="No-show" value="100% of base fare forfeited" last />
            </View>
          )}
        </View>

        <Text style={styles.disclaimer}>The information presented above is as obtained from the airline reservation system. We do not guarantee the accuracy of this information.</Text>
        <Text style={styles.disclaimer}>The baggage allowance and fare rules may vary according to stop-overs, connecting flights and changes in airline rules.</Text>
      </ScrollView>

      <View style={styles.footer}>
        <View>
          <View style={styles.footerFareRow}>
            <Text style={styles.footerPrice}>₹{totalPayable.toLocaleString('en-IN')}</Text>
            <Icon name="info" size={13} color={colors.textMuted} />
          </View>
          <Text style={styles.footerNetPay}>Net Pay ₹{totalPayable.toLocaleString('en-IN')}</Text>
        </View>
        <Pressable style={styles.continueBtn} onPress={() => router.back()}>
          <Text style={styles.continueBtnText}>Continue</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

function FareRuleRow({ label, value, last = false }) {
  return (
    <View style={[fareRuleStyles.row, !last && fareRuleStyles.divider]}>
      <Text style={fareRuleStyles.label}>{label}</Text>
      <Text style={fareRuleStyles.value}>{value}</Text>
    </View>
  )
}

const fareRuleStyles = StyleSheet.create({
  row: { paddingVertical: 10 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  label: { fontSize: 12.5, fontWeight: '600', color: colors.textDark },
  value: { fontSize: 12, color: colors.textMuted, marginTop: 3 },
})

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },

  header: { backgroundColor: colors.primaryDark, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  spacer: { width: 20 },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: fonts.heading, fontSize: 15, fontWeight: '500', color: colors.onDark },

  tabRow: { flexDirection: 'row', gap: 10, paddingHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.md },
  tabPill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.white, borderRadius: radius.pill, paddingVertical: 10, borderWidth: 1, borderColor: colors.border },
  tabPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontSize: 12.5, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: colors.onDark },

  routeCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.lg },
  routeAirline: { fontSize: 12, fontWeight: '600', color: colors.textDark, paddingHorizontal: 12, paddingTop: 12 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingBottom: 12, paddingTop: 4 },
  routeCity: { fontSize: 15, fontWeight: '700', color: colors.textDark },

  sectionBar: { backgroundColor: colors.creamAlt, paddingHorizontal: 12, paddingVertical: 8 },
  sectionBarText: { fontSize: 12, fontWeight: '600', color: colors.textBody },

  baggageRow: { flexDirection: 'row', gap: 14, padding: 14 },
  baggageIconCol: { alignItems: 'center', gap: 4, width: 56 },
  baggageType: { fontSize: 11, color: colors.textMuted },
  baggageLine: { fontSize: 12.5, color: colors.textBody, marginTop: 4 },
  baggageBold: { fontWeight: '700', color: colors.textDark },

  fareRuleBody: { padding: 14 },

  disclaimer: { fontSize: 11, color: colors.textFaint, marginTop: 10, lineHeight: 16 },

  footer: { backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerFareRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  footerPrice: { fontSize: 16, fontWeight: '700', color: colors.textDark },
  footerNetPay: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  continueBtn: { backgroundColor: colors.primary, paddingHorizontal: 22, paddingVertical: 12, borderRadius: radius.pill },
  continueBtnText: { fontSize: 13, fontWeight: '600', color: colors.onDark },
})
