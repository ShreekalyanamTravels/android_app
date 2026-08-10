import { useCallback, useMemo, useState } from 'react'
import { Alert, View, Text, Pressable, StyleSheet, ScrollView } from 'react-native'
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from '../../src/components/Icon'
import { colors, spacing, radius, fonts } from '../../src/theme/tokens'
import { getProposer, getTraveller } from '../../src/services/insuranceDraftStore'

// Net fare consistently runs ~66.8% of the gross premium across sample plans — used to
// back-derive a fare split without needing a real pricing engine behind this demo.
const NET_FARE_RATIO = 0.668

const POLICY_HIGHLIGHTS = [
  'We understand that this policy does not cover any pre-existing medical condition/injury/illness/deformity and complications arising from them that are declared or undeclared.',
  'Covers hospitalization & medical expenses',
  'Covers loss of baggage/passport',
  'Covers flight delays & trip cancellations',
  'Cashless medical facility abroad',
]

export default function ReviewPolicy() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const { provider, name, logoText, logoBg, logoColor, type, coverage, premium, persons, from, dest, start, end } = params

  const travellerList = useMemo(() => {
    try {
      const parsed = JSON.parse(params.travellers || '[]')
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : [{ relationship: 'Self', dob: '' }]
    } catch {
      return [{ relationship: 'Self', dob: '' }]
    }
  }, [params.travellers])

  const personCount = Math.max(1, Number(persons) || travellerList.length)
  const premiumNum = Number(premium) || 0
  const netFare = Math.round(premiumNum * NET_FARE_RATIO)

  const [agree, setAgree] = useState(false)
  const [, forceRefresh] = useState(0)

  useFocusEffect(useCallback(() => {
    forceRefresh(n => n + 1)
  }, []))

  const proposer = getProposer()
  const travellersDone = Array.from({ length: personCount }, (_, i) => !!getTraveller(i))
  const allTravellersDone = travellersDone.every(Boolean)
  const canBuy = agree && !!proposer && allTravellersDone

  function goProposer() {
    router.push('/insurance/proposer-details')
  }

  function goTraveller(i) {
    router.push({
      pathname: '/insurance/traveller-details',
      params: {
        index: String(i),
        relationship: travellerList[i]?.relationship || (i === 0 ? 'Self' : ''),
        dob: travellerList[i]?.dob || '',
      },
    })
  }

  function buyNow() {
    if (!canBuy) return
    const travellers = Array.from({ length: personCount }, (_, i) => getTraveller(i))
    router.push({
      pathname: '/insurance/payment',
      params: {
        provider, name, logoText, logoBg, logoColor, type, coverage, premium, persons, from, dest, start, end,
        proposer: JSON.stringify(proposer),
        travellers: JSON.stringify(travellers),
      },
    })
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.hero}>
        <View style={styles.heroRow}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Icon name="chevron-left" size={20} color={colors.onDark} />
          </Pressable>
          <Text style={styles.heroTitle}>Review Your Policy</Text>
          <View style={{ width: 20 }} />
        </View>
      </View>

      <View style={styles.tabsRow}>
        <Pressable
          style={styles.tabItem}
          onPress={() => router.push({
            pathname: '/insurance/policy-details',
            params: { provider, name, logoText, logoBg, logoColor, type, coverage, premium, persons },
          })}
        >
          <Icon name="file-invoice" size={15} color={colors.primaryDark} />
          <Text style={styles.tabItemText}>View Plan Detail</Text>
        </Pressable>
        <View style={styles.tabDivider} />
        <Pressable
          style={styles.tabItem}
          onPress={() => Alert.alert('Policy Wording', 'The full policy wording document is coming soon.')}
        >
          <Icon name="shield-check" size={15} color={colors.successColor} />
          <Text style={styles.tabItemText}>Policy Wording</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.md, gap: 14, paddingBottom: 120 }}>
        <View style={styles.card}>
          <View style={styles.planHeaderRow}>
            <View style={[styles.planLogo, { backgroundColor: logoBg }]}>
              <Text style={[styles.planLogoText, { color: logoColor }]}>{logoText}</Text>
            </View>
            <Text style={styles.planTitle}>{name}</Text>
            <Text style={styles.selfLabel}>{personCount === 1 ? 'SELF' : type?.toUpperCase()}</Text>
          </View>

          <View style={styles.planDivider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Coverage</Text>
            <Text style={styles.infoValue}>$ {Number(coverage).toLocaleString()}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Premium</Text>
            <Text style={styles.infoValue}>₹ {premiumNum.toLocaleString()}</Text>
          </View>

          <View style={styles.highlightsBox}>
            {POLICY_HIGHLIGHTS.map((h, i) => (
              <View key={i} style={styles.highlightRow}>
                <View style={styles.highlightDot} />
                <Text style={styles.highlightText}>{h}</Text>
              </View>
            ))}
          </View>
        </View>

        <Pressable style={styles.actionCard} onPress={goProposer}>
          <Icon name="file-invoice" size={20} color={colors.primaryDark} />
          <Text style={styles.actionCardTitle}>Proposer Details</Text>
          <View style={[styles.addBtn, proposer && styles.addBtnDone]}>
            <Icon name={proposer ? 'check' : 'plus'} size={13} color="#1A1A1A" />
            <Text style={styles.addBtnText}>{proposer ? 'DONE' : 'ADD'}</Text>
          </View>
        </Pressable>

        <View style={styles.card}>
          <View style={styles.travellersHeaderRow}>
            <Icon name="user-circle" size={20} color={colors.primaryDark} />
            <Text style={[styles.actionCardTitle, { textTransform: 'uppercase' }]}>{type}</Text>
          </View>
          <View style={{ gap: 10 }}>
            {Array.from({ length: personCount }, (_, i) => (
              <Pressable key={i} style={styles.travellerLine} onPress={() => goTraveller(i)}>
                <Text style={styles.travellerLineText}>Traveler {i + 1}</Text>
                <View style={[styles.addBtn, travellersDone[i] && styles.addBtnDone]}>
                  <Icon name={travellersDone[i] ? 'check' : 'plus'} size={13} color="#1A1A1A" />
                  <Text style={styles.addBtnText}>{travellersDone[i] ? 'DONE' : 'ADD'}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable style={styles.agreeRow} onPress={() => setAgree(a => !a)}>
          <View style={[styles.checkbox, agree && styles.checkboxChecked]}>
            {agree && <Icon name="check" size={12} color={colors.onDark} />}
          </View>
          <Text style={styles.agreeText}>I hereby agree to the Terms &amp; Condition of the purchase of this policy.</Text>
        </Pressable>
      </ScrollView>

      <View style={styles.bottomBar}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.bottomPremium}>₹ {premiumNum.toLocaleString()}</Text>
            <Icon name="info" size={14} color={colors.successColor} />
          </View>
          <Text style={styles.bottomNetFare}>Net Fare: ₹ {netFare.toLocaleString()}</Text>
        </View>
        <Pressable style={[styles.buyBtn, !canBuy && { opacity: 0.5 }]} onPress={buyNow} disabled={!canBuy}>
          <Text style={styles.buyBtnText}>Buy Now</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  hero: { backgroundColor: colors.primaryDark, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: 16 },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroTitle: { fontFamily: fonts.heading, fontSize: 18, fontWeight: '500', color: colors.onDark },

  tabsRow: { flexDirection: 'row', backgroundColor: colors.pinkBg, marginHorizontal: spacing.lg, marginTop: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  tabItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  tabItemText: { fontSize: 12.5, fontWeight: '600', color: colors.textDark },
  tabDivider: { width: 1, backgroundColor: colors.border },

  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 14 },
  planHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  planLogo: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  planLogoText: { fontSize: 10, fontWeight: '800' },
  planTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.textDark },
  selfLabel: { fontSize: 12.5, fontWeight: '700', color: colors.primary, letterSpacing: 0.3 },

  planDivider: { borderTopWidth: 1, borderTopColor: colors.divider, marginVertical: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  infoLabel: { fontSize: 13, color: colors.textMuted },
  infoValue: { fontSize: 15.5, fontWeight: '700', color: colors.textDark },

  highlightsBox: { backgroundColor: colors.orangeBg, borderRadius: radius.md, padding: 14, marginTop: 12, gap: 10 },
  highlightRow: { flexDirection: 'row', gap: 8 },
  highlightDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent, marginTop: 6 },
  highlightText: { flex: 1, fontSize: 12.5, color: colors.textBody, lineHeight: 18 },

  actionCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 16 },
  actionCardTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.primaryDark },

  travellersHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  travellerLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  travellerLineText: { fontSize: 13, color: colors.textMuted },

  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.accent, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 7 },
  addBtnDone: { backgroundColor: colors.success.bg },
  addBtnText: { fontSize: 11.5, fontWeight: '700', color: '#1A1A1A' },

  agreeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 2 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: colors.borderLight, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  agreeText: { flex: 1, fontSize: 12.5, color: colors.textMuted, lineHeight: 18 },

  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: spacing.lg, paddingVertical: 14, paddingBottom: spacing.xl },
  bottomPremium: { fontSize: 19, fontWeight: '800', color: colors.primaryDark },
  bottomNetFare: { fontSize: 11.5, color: colors.textFaint, marginTop: 2 },
  buyBtn: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 32, paddingVertical: 13 },
  buyBtnText: { fontSize: 14.5, fontWeight: '700', color: colors.onDark },
})
