import { useEffect, useMemo, useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from '../../src/components/Icon'
import { colors, spacing, radius, fonts } from '../../src/theme/tokens'

const PLANS = [
  { provider: 'Religare', name: 'Explore - Asia', logoText: 'care', logoBg: '#F6D000', logoColor: '#1A1A1A', coverage: 25000, premium: 682 },
  { provider: 'Religare', name: 'Explore - Asia', logoText: 'care', logoBg: '#F6D000', logoColor: '#1A1A1A', coverage: 50000, premium: 801 },
  { provider: 'IndusInd', name: 'Standard', logoText: 'IB', logoBg: '#8B1C2C', logoColor: '#FFFFFF', coverage: 25000, premium: 807, recommended: true },
  { provider: 'IndusInd', name: 'Silver', logoText: 'IB', logoBg: '#8B1C2C', logoColor: '#FFFFFF', coverage: 50000, premium: 950, recommended: true },
  { provider: 'HDFC Ergo', name: 'Travel Assure Basic', logoText: 'HE', logoBg: '#003D7C', logoColor: '#FFFFFF', coverage: 25000, premium: 540 },
  { provider: 'Bajaj Allianz', name: 'Travel Care Silver', logoText: 'BA', logoBg: '#0055A5', logoColor: '#FFFFFF', coverage: 50000, premium: 860 },
  { provider: 'ICICI Lombard', name: 'Travel Shield Gold', logoText: 'IL', logoBg: '#E87722', logoColor: '#FFFFFF', coverage: 100000, premium: 1240 },
]

function formatShort(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return `${d} ${date.toLocaleDateString('en-US', { month: 'short' })}'${String(y).slice(2)}`
}

export default function InsurancePlans() {
  const router = useRouter()
  const { type, from, dest, start, end, days, persons, travellers } = useLocalSearchParams()

  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState('premium')
  const [searching, setSearching] = useState(true)

  useEffect(() => {
    setSearching(true)
    const t = setTimeout(() => setSearching(false), 700)
    return () => clearTimeout(t)
  }, [type, from, dest, start, end, persons])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = PLANS.filter(p => !q || p.provider.toLowerCase().includes(q) || p.name.toLowerCase().includes(q))
    return [...list].sort((a, b) => sortBy === 'premium' ? a.premium - b.premium : a.coverage - b.coverage)
  }, [query, sortBy])

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.hero}>
        <View style={styles.heroRow}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Icon name="chevron-left" size={20} color={colors.onDark} />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <View style={styles.heroTitleRow}>
              <Text style={styles.heroTitle} numberOfLines={1}>{from} to {dest}</Text>
              <Pressable onPress={() => router.back()} hitSlop={8}>
                <Icon name="pencil" size={14} color={colors.onDark} />
              </Pressable>
            </View>
            <Text style={styles.heroSub}>{formatShort(start)} - {formatShort(end)} | {days} Days</Text>
          </View>
          <View style={{ width: 20 }} />
        </View>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Icon name="search" size={15} color={colors.textFaint} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search"
            placeholderTextColor={colors.textFaint}
            style={styles.searchInput}
          />
        </View>
      </View>

      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>Sort By :</Text>
        <Pressable style={[styles.sortPill, sortBy === 'premium' && styles.sortPillActive]} onPress={() => setSortBy('premium')}>
          <Text style={[styles.sortPillText, sortBy === 'premium' && styles.sortPillTextActive]}>Premium</Text>
          <Icon name="chevron-down" size={11} color={sortBy === 'premium' ? colors.primary : colors.textFaint} />
        </Pressable>
        <Pressable style={[styles.sortPill, sortBy === 'coverage' && styles.sortPillActive]} onPress={() => setSortBy('coverage')}>
          <Text style={[styles.sortPillText, sortBy === 'coverage' && styles.sortPillTextActive]}>Coverage</Text>
          <Icon name="chevron-down" size={11} color={sortBy === 'coverage' ? colors.primary : colors.textFaint} />
        </Pressable>
      </View>

      {!searching && (
        <View style={styles.countRow}>
          <Text style={styles.countText}>Showing {filtered.length} of {PLANS.length} Policy Found</Text>
          <Icon name="eye" size={17} color={colors.textFaint} />
        </View>
      )}

      {searching ? (
        <View style={styles.emptyState}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.emptyStateTitle}>Searching best insurance plans for you…</Text>
        </View>
      ) : (
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.sm, gap: 14 }}>
        {filtered.map((p, i) => (
          <View key={i} style={{ marginTop: p.recommended ? 10 : 0 }}>
            {p.recommended && (
              <View style={styles.recommendedBadge}>
                <Icon name="check" size={11} color={colors.successColor} />
                <Text style={styles.recommendedBadgeText}>Recommended</Text>
              </View>
            )}
            <View style={styles.planCard}>
              <View style={styles.planHeader}>
                <View style={[styles.planLogo, { backgroundColor: p.logoBg }]}>
                  <Text style={[styles.planLogoText, { color: p.logoColor }]}>{p.logoText}</Text>
                </View>
                <Text style={styles.planTitle}>{p.provider} - {p.name}</Text>
              </View>

              <View style={styles.planDivider} />

              <View style={styles.planRow}>
                <View style={styles.planCol}>
                  <Text style={styles.planSubLabel}>Coverage</Text>
                  <Text style={styles.planSubValue}>$ {p.coverage.toLocaleString()}</Text>
                  <Pressable
                    style={styles.policyDetailsBtn}
                    onPress={() => router.push({
                      pathname: '/insurance/policy-details',
                      params: {
                        provider: p.provider, name: p.name, logoText: p.logoText, logoBg: p.logoBg, logoColor: p.logoColor,
                        type, coverage: String(p.coverage), premium: String(p.premium), persons,
                      },
                    })}
                  >
                    <Text style={styles.policyDetailsBtnText}>Policy Detail</Text>
                  </Pressable>
                </View>
                <View style={[styles.planCol, styles.planColRight]}>
                  <Text style={styles.planSubLabel}>Premium</Text>
                  <Text style={styles.planSubValue}>₹ {p.premium.toLocaleString()}</Text>
                  <Pressable
                    style={styles.selectBtn}
                    onPress={() => router.push({
                      pathname: '/insurance/review',
                      params: {
                        provider: p.provider, name: p.name, logoText: p.logoText, logoBg: p.logoBg, logoColor: p.logoColor,
                        type, from, dest, start, end, days, persons, travellers,
                        coverage: String(p.coverage), premium: String(p.premium),
                      },
                    })}
                  >
                    <Text style={styles.selectBtnText}>Select</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        ))}

        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Icon name="shield-check" size={30} color={colors.textFaint} />
            <Text style={styles.emptyStateText}>No policies match your search</Text>
          </View>
        )}
      </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  hero: { backgroundColor: colors.primaryDark, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: 20 },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroTitle: { fontFamily: fonts.heading, fontSize: 17, fontWeight: '500', color: colors.onDark, maxWidth: 220 },
  heroSub: { fontSize: 11.5, color: colors.onDarkMuted2, marginTop: 3 },

  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: spacing.lg, marginTop: -18 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.white, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: colors.border, boxShadow: '0 3px 8px rgba(0,0,0,0.06)', elevation: 2 },
  searchInput: { flex: 1, fontSize: 13, color: colors.textDark, padding: 0 },

  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: spacing.lg, marginTop: 14 },
  sortLabel: { fontSize: 12.5, color: colors.textMuted },
  sortPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  sortPillActive: { borderColor: colors.primary },
  sortPillText: { fontSize: 12.5, fontWeight: '500', color: colors.textMuted },
  sortPillTextActive: { color: colors.primary, fontWeight: '700' },

  countRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, marginTop: 12 },
  countText: { fontSize: 12.5, color: colors.textDark },

  recommendedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: colors.success.bg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, marginBottom: -12, marginLeft: 8, zIndex: 1 },
  recommendedBadgeText: { fontSize: 10.5, fontWeight: '700', color: colors.successColor },

  planCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 14 },
  planHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  planLogo: { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  planLogoText: { fontSize: 11, fontWeight: '800' },
  planTitle: { fontSize: 14.5, fontWeight: '700', color: colors.textDark, flex: 1 },

  planDivider: { borderTopWidth: 1, borderTopColor: colors.divider, marginVertical: 12 },

  planRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 },
  planCol: { flex: 1 },
  planColRight: { alignItems: 'flex-end' },
  planSubLabel: { fontSize: 11, color: colors.textFaint },
  planSubValue: { fontSize: 15, fontWeight: '700', color: colors.textDark, marginTop: 2 },

  policyDetailsBtn: { alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1.3, borderColor: colors.primary },
  policyDetailsBtnText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  selectBtn: { marginTop: 10, paddingHorizontal: 20, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.primary },
  selectBtnText: { fontSize: 12, fontWeight: '700', color: colors.onDark },

  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 10, paddingHorizontal: spacing.lg },
  emptyStateText: { fontSize: 13, color: colors.textMuted },
  emptyStateTitle: { fontSize: 13.5, fontWeight: '600', color: colors.textDark, textAlign: 'center' },
})
