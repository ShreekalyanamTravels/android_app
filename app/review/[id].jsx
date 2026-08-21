import { useEffect, useState } from 'react'
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from '../../src/components/Icon'
import WizardHeader from '../../src/components/WizardHeader'
import Preloader from '../../src/components/Preloader'
import { getDraft, legLabel } from '../../src/services/flightBookingFlow'
import { colors, spacing, radius, fonts } from '../../src/theme/tokens'

export default function ReviewBooking() {
  const router = useRouter()
  const { id } = useLocalSearchParams()
  const [draft, setDraft] = useState(null)

  useEffect(() => { getDraft(id).then(setDraft) }, [id])

  if (!draft) {
    return <Preloader />
  }

  const maskedMobile = draft.contact?.mobile ? draft.contact.mobile.replace(/(\d{2})\d+(\d{3})$/, '$1•••••$2') : ''
  const totalPayable = draft.fare?.totalPayableAmt ?? 0

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <WizardHeader title="Review booking" subtitle="Step 4 of 6" step={4} />

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        {draft.legs.map((leg, i) => (
          <SectorCard
            key={i}
            label={`${legLabel(draft.legs.length, i)} · ${leg.date?.toUpperCase()}`}
            leg={leg}
            id={draft.id}
            legIndex={i}
          />
        ))}

        <View style={styles.card}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardTitle}>Traveller{draft.passengers.length > 1 ? 's' : ''} · {draft.passengers.length}</Text>
            <Icon name="pencil" size={13} color={colors.primary} />
          </View>
          {draft.passengers.map((p, i) => (
            <Text key={i} style={styles.travellerLine}>{i + 1}. {p.title} {p.firstName} {p.lastName} <Text style={styles.travellerMuted}>· {p.type}</Text></Text>
          ))}
          <Text style={styles.contactLine}><Icon name="mail" size={11} color={colors.textMuted} /> {draft.contact?.email} · <Icon name="lock" size={11} color={colors.textMuted} /> {draft.contact?.countryCode} {maskedMobile}</Text>
        </View>

        {draft.gst && (
          <View style={styles.card}>
            <View style={styles.cardTopRow}>
              <Text style={styles.cardTitle}>GST details</Text>
              <Icon name="pencil" size={13} color={colors.primary} />
            </View>
            <Text style={styles.gstCompany}>{draft.gst.companyName}</Text>
            <Text style={styles.gstLine}>GSTIN {draft.gst.gstNumber}{draft.gst.stateName ? ` · ${draft.gst.stateName}` : ''}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.payBtn} onPress={() => router.push(`/payment/${id}`)}>
          <Text style={styles.payBtnText}>Pay ₹{totalPayable.toLocaleString('en-IN')}</Text>
          <Icon name="arrow-right" size={12} color={colors.onDark} />
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

function SectorCard({ label, leg, id, legIndex }) {
  const router = useRouter()
  return (
    <View style={styles.card}>
      <View style={styles.cardTopRow}>
        <Text style={styles.sectorLabel}>{label}</Text>
      </View>
      <Text style={styles.sectorTime}>{leg.dep} {leg.from} <Icon name="arrow-right" size={10} color={colors.textDark} /> {leg.arr} {leg.to}</Text>
      <Text style={styles.sectorDetail}>{leg.airline} {leg.flightCode} · {leg.fareId} · {leg.cabinBaggage} cabin · {leg.stops}</Text>
      <Pressable style={styles.fareBar} onPress={() => router.push(`/fare-rules/${id}?leg=${legIndex}`)}>
        <Text style={styles.nonRefundable}>{leg.refundable ? 'Refundable' : 'Non Refundable'}</Text>
        <View style={styles.fareRuleLinkRow}>
          <Icon name="info" size={13} color={colors.successColor} />
          <Text style={styles.fareRulesLink}>Fare Rule</Text>
        </View>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },

  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 12, marginBottom: spacing.md },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 12, fontWeight: '500', color: colors.textDark },

  sectorLabel: { fontSize: 11, fontWeight: '500', color: colors.primary },
  sectorTime: { fontSize: 14, fontWeight: '500', color: colors.textDark, marginTop: 6 },
  sectorDetail: { fontSize: 11, color: colors.textMuted, marginTop: 2 },

  fareBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.divider },
  nonRefundable: { fontSize: 11, fontWeight: '600', color: colors.errorColor },
  fareRuleLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fareRulesLink: { fontSize: 11, fontWeight: '600', color: colors.primary },

  travellerLine: { fontSize: 13, color: colors.textDark, marginTop: 6 },
  travellerMuted: { fontSize: 11, color: colors.textMuted },
  contactLine: { fontSize: 11, color: colors.textMuted, marginTop: 4 },

  gstCompany: { fontSize: 12, color: colors.textBody, marginTop: 6 },
  gstLine: { fontSize: 11, color: colors.textMuted, marginTop: 2 },

  footer: { backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md + spacing.sm, flexDirection: 'row', gap: 8, alignItems: 'center' },
  payBtn: { flex: 1, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, paddingVertical: 10, borderRadius: radius.pill },
  payBtnText: { fontSize: 13, fontWeight: '500', color: colors.onDark },
})
