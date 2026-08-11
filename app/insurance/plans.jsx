import { useEffect, useMemo, useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from '../../src/components/Icon'
import { getInsurancePlans, getInsurancePremium } from '../../src/services/insuranceApi'
import { colors, spacing, radius, fonts } from '../../src/theme/tokens'

// Ported from the web app's insuranceData.ts — keyed exactly by the `logo` field the real
// /insurance/plans API returns. Anything the live Bajaj catalog sends that isn't in this fixed
// set falls back to a generic badge instead of breaking.
const SUPPLIER_COLORS = { BAJAJ: '#154690', ICICI: '#c0392b', TATA: '#0059a8', CARE: '#e85c0d', II: '#1a3c6e' }
const SUPPLIER_LABELS = {
  BAJAJ: { line1: 'BAJAJ', line2: 'Allianz' },
  ICICI: { line1: 'ICICI', line2: 'Lombard' },
  TATA: { line1: 'TATA', line2: 'AIG' },
  CARE: { line1: 'Care', line2: 'Health' },
  II: { line1: 'Indus', line2: 'Ind' },
}
function supplierColor(logo) { return SUPPLIER_COLORS[logo] || '#f07820' }
function supplierLabel(logo) { return SUPPLIER_LABELS[logo] || { line1: (logo || '?').slice(0, 5), line2: '' } }

const COVERAGE_BUCKETS = [
  { label: 'Below $50,000', max: 49999 },
  { label: '$50,001 – $250,000', max: 250000 },
  { label: '$250,001 – $500,000', max: 500000 },
  { label: '$500,001 – $1,000,000', max: 1000000 },
]

// Runs `fn` over `items` with at most `limit` in flight at once — mirrors the web app's own
// eligibility-check loop so real per-plan premiums don't fire dozens of requests simultaneously.
async function mapWithConcurrency(items, limit, fn) {
  let next = 0
  async function worker() {
    while (next < items.length) {
      const item = items[next++]
      await fn(item)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
}

function formatShort(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return `${d} ${date.toLocaleDateString('en-US', { month: 'short' })}'${String(y).slice(2)}`
}

function toggleArr(setter, val) {
  setter(arr => arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
}

export default function InsurancePlans() {
  const router = useRouter()
  const { type, from, dest, start, end, days, persons, travellers } = useLocalSearchParams()
  const personCount = Math.max(1, Number(persons) || 1)
  const leadDob = useMemo(() => {
    try {
      const parsed = JSON.parse(travellers || '[]')
      return Array.isArray(parsed) ? (parsed[0]?.dob || '') : ''
    } catch {
      return ''
    }
  }, [travellers])

  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState('premium')
  const [supplierFilter, setSupplierFilter] = useState([])
  const [coverageFilter, setCoverageFilter] = useState([])

  const [plans, setPlans] = useState([])
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [checkingEligibility, setCheckingEligibility] = useState(false)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoadingPlans(true)
    setCheckingEligibility(false)
    setLoadError('')
    setPlans([])
    setSupplierFilter([])
    setCoverageFilter([])

    getInsurancePlans({ type, dest, dep: start, ret: end, dob: leadDob })
      .then(async data => {
        if (cancelled) return
        const loadedPlans = data.plans || []
        setLoadingPlans(false)

        if (!(start && end && leadDob)) {
          setPlans(loadedPlans)
          return
        }

        setCheckingEligibility(true)
        const eligible = []
        await mapWithConcurrency(loadedPlans, 4, async plan => {
          const real = await getInsurancePremium({ plan: plan.name, dep: start, ret: end, dob: leadDob, dest })
          if (cancelled || !real || !real.totalPremium) return
          eligible.push({ ...plan, premium: Math.round(real.totalPremium) })
        })
        if (cancelled) return
        eligible.sort((a, b) => loadedPlans.findIndex(p => p.id === a.id) - loadedPlans.findIndex(p => p.id === b.id))
        setPlans(eligible)
        setCheckingEligibility(false)
      })
      .catch(e => {
        if (cancelled) return
        setLoadError(e.message || 'Could not load insurance plans.')
        setLoadingPlans(false)
        setCheckingEligibility(false)
      })

    return () => { cancelled = true }
  }, [type, dest, start, end, leadDob])

  const supplierOptions = useMemo(() => [...new Set(plans.map(p => p.supplier))], [plans])
  const supplierCounts = useMemo(() => {
    const counts = {}
    for (const s of supplierOptions) counts[s] = plans.filter(p => p.supplier === s).length
    return counts
  }, [plans, supplierOptions])
  const coverageBucketCounts = useMemo(() => COVERAGE_BUCKETS.map(b => ({
    ...b, count: plans.filter(p => p.coverage <= b.max).length,
  })), [plans])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = plans.filter(p => {
      if (q && !p.supplier.toLowerCase().includes(q) && !p.name.toLowerCase().includes(q)) return false
      if (supplierFilter.length && !supplierFilter.includes(p.supplier)) return false
      if (coverageFilter.length && !coverageFilter.some(max => p.coverage <= max)) return false
      return true
    })
    return [...list].sort((a, b) => sortBy === 'premium' ? a.premium - b.premium : b.coverage - a.coverage)
  }, [plans, query, sortBy, supplierFilter, coverageFilter])

  const loading = loadingPlans || checkingEligibility

  function totalFor(plan) {
    const gstPerHead = Math.round(plan.premium * 0.18)
    const totalPerHead = plan.premium + gstPerHead
    return totalPerHead * personCount
  }

  function goPolicyDetails(p) {
    router.push({
      pathname: '/insurance/policy-details',
      params: {
        provider: p.supplier, name: p.name, logoText: supplierLabel(p.logo).line1, logoBg: supplierColor(p.logo), logoColor: '#FFFFFF',
        type, coverage: String(p.coverage), premium: String(totalFor(p)), persons,
      },
    })
  }

  function selectPlan(p) {
    router.push({
      pathname: '/insurance/review',
      params: {
        provider: p.supplier, name: p.name, logoText: supplierLabel(p.logo).line1, logoBg: supplierColor(p.logo), logoColor: '#FFFFFF',
        type, from, dest, start, end, days, persons, travellers,
        coverage: String(p.coverage), premium: String(totalFor(p)),
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

      {!loading && plans.length > 0 && (
        <>
          {supplierOptions.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipScrollContent}>
              {supplierOptions.map(s => {
                const active = supplierFilter.includes(s)
                return (
                  <Pressable key={s} style={[styles.chip, active && styles.chipActive]} onPress={() => toggleArr(setSupplierFilter, s)}>
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{s} ({supplierCounts[s]})</Text>
                  </Pressable>
                )
              })}
            </ScrollView>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipScrollContent}>
            {coverageBucketCounts.filter(b => b.count > 0).map(b => {
              const active = coverageFilter.includes(b.max)
              return (
                <Pressable key={b.max} style={[styles.chip, active && styles.chipActive]} onPress={() => toggleArr(setCoverageFilter, b.max)}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{b.label} ({b.count})</Text>
                </Pressable>
              )
            })}
          </ScrollView>
        </>
      )}

      {!loading && (
        <View style={styles.countRow}>
          <Text style={styles.countText}>Showing {filtered.length} of {plans.length} Policy Found</Text>
          <Icon name="eye" size={17} color={colors.textFaint} />
        </View>
      )}

      {loading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.emptyStateTitle}>
            {checkingEligibility ? 'Checking plan eligibility for your trip…' : 'Searching best insurance plans for you…'}
          </Text>
        </View>
      ) : (
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.sm, gap: 14 }}>
        {loadError ? (
          <View style={styles.emptyState}>
            <Icon name="alert-triangle" size={26} color={colors.textFaint} />
            <Text style={styles.emptyStateText}>{loadError}</Text>
          </View>
        ) : plans.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="shield-check" size={30} color={colors.textFaint} />
            <Text style={styles.emptyStateText}>No eligible plans found for your trip dates and traveller age.</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="shield-check" size={30} color={colors.textFaint} />
            <Text style={styles.emptyStateText}>No policies match your filters</Text>
          </View>
        ) : filtered.map((p) => (
          <View key={p.id} style={styles.planCard}>
            <View style={styles.planHeader}>
              <View style={[styles.planLogo, { backgroundColor: supplierColor(p.logo) }]}>
                <Text style={styles.planLogoText}>{supplierLabel(p.logo).line1}</Text>
              </View>
              <Text style={styles.planTitle}>{p.supplier} - {p.name}</Text>
            </View>

            <View style={styles.planDivider} />

            <View style={styles.planRow}>
              <View style={styles.planCol}>
                <Text style={styles.planSubLabel}>Coverage</Text>
                <Text style={styles.planSubValue}>$ {p.coverage.toLocaleString()}</Text>
                <Pressable style={styles.policyDetailsBtn} onPress={() => goPolicyDetails(p)}>
                  <Text style={styles.policyDetailsBtnText}>Policy Detail</Text>
                </Pressable>
              </View>
              <View style={[styles.planCol, styles.planColRight]}>
                <Text style={styles.planSubLabel}>Premium</Text>
                <Text style={styles.planSubValue}>₹ {p.premium.toLocaleString()}</Text>
                <Pressable style={styles.selectBtn} onPress={() => selectPlan(p)}>
                  <Text style={styles.selectBtnText}>Select</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ))}
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

  chipScroll: { flexGrow: 0, marginTop: 10 },
  chipScrollContent: { gap: 8, paddingHorizontal: spacing.lg },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 11.5, fontWeight: '600', color: colors.textMuted },
  chipTextActive: { color: colors.onDark },

  countRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, marginTop: 12 },
  countText: { fontSize: 12.5, color: colors.textDark },

  planCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 14 },
  planHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  planLogo: { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  planLogoText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF' },
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
  emptyStateText: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  emptyStateTitle: { fontSize: 13.5, fontWeight: '600', color: colors.textDark, textAlign: 'center' },
})
