import { Alert, View, Text, Pressable, StyleSheet, ScrollView } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from '../../src/components/Icon'
import { colors, spacing, radius, fonts } from '../../src/theme/tokens'
import { getProposer, getTraveller, resetDraft } from '../../src/services/insuranceDraftStore'

function formatShort(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return `${d} ${date.toLocaleDateString('en-US', { month: 'short' })}'${String(y).slice(2)}`
}

export default function InsuranceConfirmation() {
  const router = useRouter()
  const { name, logoText, logoBg, logoColor, coverage, premium, persons, dest, start, end, ref, policyNumber } = useLocalSearchParams()

  const policyNo = policyNumber || ref
  const proposer = getProposer()
  const personCount = Math.max(1, Number(persons) || 1)
  const travellerNames = Array.from({ length: personCount }, (_, i) => {
    const t = getTraveller(i)
    return t ? `${t.salutation} ${t.firstName} ${t.lastName}`.trim() : `Traveler ${i + 1}`
  })

  function comingSoon(feature) {
    Alert.alert('Coming soon', `${feature} is not available yet — check back soon.`)
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={styles.hero}>
          <View style={styles.checkCircle}>
            <Icon name="check" size={26} color={colors.successColor} />
          </View>
          <Text style={styles.heroTitle}>Policy confirmed</Text>
          <Text style={styles.heroSub}>Sent to {proposer?.email || 'your registered email'}</Text>
        </View>

        <View style={{ padding: 14, gap: 10 }}>
          <View style={styles.policyCard}>
            <View style={styles.policyHeader}>
              <Text style={styles.policyHeaderText}><Icon name="shield-check" size={11} color={colors.primary} /> {policyNo}</Text>
              <Text style={styles.policyStatus}>Active</Text>
            </View>
            <View style={styles.policyBody}>
              <View style={styles.planRow}>
                <View style={[styles.planLogo, { backgroundColor: logoBg }]}>
                  <Text style={[styles.planLogoText, { color: logoColor }]}>{logoText}</Text>
                </View>
                <Text style={styles.planTitle}>{name}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Coverage</Text>
                <Text style={styles.infoValue}>$ {Number(coverage).toLocaleString()}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Premium paid</Text>
                <Text style={styles.infoValue}>₹ {Number(premium).toLocaleString()}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Cover period</Text>
                <Text style={styles.infoValueSmall}>{formatShort(start)} – {formatShort(end)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Destination</Text>
                <Text style={styles.infoValueSmall}>{dest}</Text>
              </View>

              <View style={styles.travellersBox}>
                <Text style={styles.travellersLabel}>Travellers</Text>
                <Text style={styles.travellersNames}>{travellerNames.join(', ')}</Text>
              </View>
            </View>
          </View>

          <View style={styles.actionsGrid}>
            <ActionTile icon="download" color={colors.primary} label="Policy PDF" onPress={() => comingSoon('Policy PDF download')} />
            <ActionTile icon="brand-whatsapp" color={colors.successColor} label="WhatsApp" onPress={() => comingSoon('Sharing via WhatsApp')} />
            <ActionTile icon="mail" color={colors.primary} label="Email" onPress={() => comingSoon('Emailing the policy')} />
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.outlineBtn} onPress={() => router.replace('/(tabs)/bookings')}>
          <Text style={styles.outlineBtnText}>My bookings</Text>
        </Pressable>
        <Pressable style={styles.filledBtn} onPress={() => { resetDraft(); router.replace('/insurance') }}>
          <Text style={styles.filledBtnText}>Book another</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

function ActionTile({ icon, color, label, onPress }) {
  return (
    <Pressable style={styles.actionTile} onPress={onPress}>
      <Icon name={icon} size={17} color={color} />
      <Text style={styles.actionTileLabel}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },

  hero: { backgroundColor: colors.primaryDark, paddingVertical: 20, alignItems: 'center' },
  checkCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.pinkBg, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { marginTop: 10, fontFamily: fonts.heading, fontSize: 17, fontWeight: '500', color: colors.onDark },
  heroSub: { marginTop: 2, fontSize: 11, color: colors.onDarkMuted },

  policyCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, overflow: 'hidden' },
  policyHeader: { backgroundColor: colors.pinkBg, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  policyHeaderText: { fontSize: 11, fontWeight: '600', color: colors.primary },
  policyStatus: { fontSize: 11, fontWeight: '700', color: colors.successColor },
  policyBody: { padding: 14 },

  planRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  planLogo: { width: 34, height: 34, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  planLogoText: { fontSize: 10, fontWeight: '800' },
  planTitle: { fontSize: 14.5, fontWeight: '700', color: colors.textDark, flex: 1 },

  divider: { borderTopWidth: 1, borderTopColor: colors.divider, marginVertical: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  infoLabel: { fontSize: 12.5, color: colors.textMuted },
  infoValue: { fontSize: 14.5, fontWeight: '700', color: colors.textDark },
  infoValueSmall: { fontSize: 12.5, fontWeight: '600', color: colors.textDark },

  travellersBox: { marginTop: 10, backgroundColor: colors.cream, borderRadius: radius.md, padding: 10 },
  travellersLabel: { fontSize: 10.5, color: colors.textFaint, letterSpacing: 0.3, textTransform: 'uppercase' },
  travellersNames: { fontSize: 12.5, fontWeight: '600', color: colors.textDark, marginTop: 3 },

  actionsGrid: { flexDirection: 'row', gap: 8 },
  actionTile: { flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 10, alignItems: 'center' },
  actionTileLabel: { marginTop: 3, fontSize: 11, color: colors.textBody },

  footer: { backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border, padding: 14, flexDirection: 'row', gap: 8 },
  outlineBtn: { flex: 1, borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', paddingVertical: 10, borderRadius: radius.pill },
  outlineBtnText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  filledBtn: { flex: 1, backgroundColor: colors.primary, alignItems: 'center', paddingVertical: 10, borderRadius: radius.pill },
  filledBtnText: { fontSize: 13, fontWeight: '600', color: colors.onDark },
})
