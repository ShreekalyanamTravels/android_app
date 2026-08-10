import { useState } from 'react'
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from '../../src/components/Icon'
import { colors, spacing, radius, fonts } from '../../src/theme/tokens'

const BENEFITS = [
  { title: 'Hospitalization Expenses', detail: 'Covers room rent, nursing, doctor fees, and other medical expenses during hospitalization abroad.' },
  { title: 'In-patient Care', detail: 'Covers costs for treatment requiring an overnight or extended hospital stay.' },
  { title: 'Life Threatening Condition for PED', detail: 'Emergency treatment for life-threatening pre-existing conditions during the trip.' },
]

const MORE_BENEFITS = [
  'Loss of Checked-in Baggage', 'Baggage Delay', 'Trip Delay', 'Trip Cancellation', 'Missed Connection',
  'Emergency Dental Treatment', 'Repatriation of Remains', 'Personal Accident Cover', 'Emergency Evacuation',
  'Loss of Passport', 'Third-party Liability', 'Home Burglary Cover', 'Financial Emergency Assistance',
  'Compassionate Visit', 'Daily Hospital Cash', 'Adventure Sports Cover', 'Political Evacuation',
]

export default function PolicyDetails() {
  const router = useRouter()
  const { provider, name, logoText, logoBg, logoColor, type, coverage, premium, persons } = useLocalSearchParams()
  const [expanded, setExpanded] = useState({})
  const [showMore, setShowMore] = useState(false)

  const personCount = Math.max(1, Number(persons) || 1)
  const premiumNum = Number(premium) || 0
  const share = personCount > 0 ? premiumNum / personCount : premiumNum

  function toggle(i) {
    setExpanded(e => ({ ...e, [i]: !e[i] }))
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.hero}>
        <View style={styles.heroRow}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Icon name="chevron-left" size={20} color={colors.onDark} />
          </Pressable>
          <Text style={styles.heroTitle}>Policy Details</Text>
          <View style={{ width: 20 }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl, gap: 14 }}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={[styles.logo, { backgroundColor: logoBg }]}>
              <Text style={[styles.logoText, { color: logoColor }]}>{logoText}</Text>
            </View>
            <Text style={styles.planTitle}>{name}</Text>
            <View style={styles.typePill}>
              <Text style={styles.typePillText}>{type}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Coverage</Text>
            <Text style={styles.infoValue}>$ {Number(coverage).toLocaleString()}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Premium</Text>
            <Text style={styles.infoValue}>₹ {premiumNum.toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Premium Distributions</Text>
          {Array.from({ length: personCount }, (_, i) => (
            <View key={i} style={styles.travellerRow}>
              <View style={styles.travellerIcon}>
                <Icon name="user" size={16} color={colors.primary} />
              </View>
              <Text style={styles.travellerLabel}>{i === 0 ? 'SELF' : `TRAVELLER ${i + 1}`}</Text>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.travellerPremium}>₹ {share.toFixed(3)}</Text>
                <Text style={styles.travellerPremiumSub}>Premium</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.benefitsCard}>
          <Text style={styles.sectionTitle}>Benefits</Text>

          {BENEFITS.map((b, i) => (
            <Pressable key={i} style={styles.benefitRow} onPress={() => toggle(i)}>
              <View style={styles.benefitRowTop}>
                <View style={styles.benefitIcon}>
                  <Icon name="shield-check" size={15} color={colors.primary} />
                </View>
                <Text style={styles.benefitTitle}>{b.title}</Text>
                <Icon name="chevron-down" size={16} color={colors.textFaint} style={{ transform: [{ rotate: expanded[i] ? '180deg' : '0deg' }] }} />
              </View>
              {expanded[i] && <Text style={styles.benefitDetail}>{b.detail}</Text>}
            </Pressable>
          ))}

          {showMore && MORE_BENEFITS.map((b, i) => (
            <View key={`more-${i}`} style={styles.benefitRow}>
              <View style={styles.benefitRowTop}>
                <View style={styles.benefitIcon}>
                  <Icon name="shield-check" size={15} color={colors.primary} />
                </View>
                <Text style={styles.benefitTitle}>{b}</Text>
              </View>
            </View>
          ))}

          <Pressable style={styles.moreBtn} onPress={() => setShowMore(s => !s)}>
            <Text style={styles.moreBtnText}>{showMore ? 'Show less' : `${MORE_BENEFITS.length}+ more`}</Text>
          </Pressable>
        </View>

        <View style={styles.disclaimer}>
          <Icon name="info" size={16} color={colors.orangeText} />
          <Text style={styles.disclaimerText}>These Premium are inclusive of @18% GST and in INR</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  hero: { backgroundColor: colors.primaryDark, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: 16 },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroTitle: { fontFamily: fonts.heading, fontSize: 18, fontWeight: '500', color: colors.onDark },

  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 14 },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  logo: { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 11, fontWeight: '800' },
  planTitle: { fontSize: 15.5, fontWeight: '700', color: colors.textDark, flex: 1 },
  typePill: { backgroundColor: colors.info.bg, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5 },
  typePillText: { fontSize: 11.5, fontWeight: '600', color: colors.info.fg },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  infoLabel: { fontSize: 13, color: colors.textMuted },
  infoValue: { fontSize: 17, fontWeight: '700', color: colors.textDark },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.primaryDark, marginBottom: 12 },

  travellerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, marginBottom: 8 },
  travellerIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.pinkBg, alignItems: 'center', justifyContent: 'center' },
  travellerLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.textDark, letterSpacing: 0.3 },
  travellerPremium: { fontSize: 15, fontWeight: '700', color: colors.textDark },
  travellerPremiumSub: { fontSize: 10.5, color: colors.textFaint, marginTop: 1 },

  benefitsCard: { backgroundColor: colors.pinkBg, borderRadius: radius.lg, padding: 14 },
  benefitRow: { backgroundColor: colors.white, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10 },
  benefitRowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  benefitIcon: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' },
  benefitTitle: { flex: 1, fontSize: 13.5, fontWeight: '700', color: colors.textDark },
  benefitDetail: { fontSize: 12, color: colors.textMuted, marginTop: 8, lineHeight: 17 },

  moreBtn: { alignSelf: 'center', marginTop: 4, paddingHorizontal: 18, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: colors.white },
  moreBtnText: { fontSize: 12.5, fontWeight: '600', color: colors.primary },

  disclaimer: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.orangeBg, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 12 },
  disclaimerText: { flex: 1, fontSize: 12, color: colors.orangeText },
})
