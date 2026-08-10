import { useCallback, useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, StyleSheet, ScrollView, RefreshControl } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from '../../src/components/Icon'
import AppDrawer from '../../src/components/AppDrawer'
import { getCurrentUser } from '../../src/services/authService'
import { unreadCount } from '../../src/services/notificationsService'
import { listProducts } from '../../src/services/productsService'
import { PRODUCT_TILES, DEFAULT_PRODUCTS } from '../../src/data/productTiles'
import { usePullToRefresh } from '../../src/hooks/usePullToRefresh'
import { colors, spacing, radius, fonts } from '../../src/theme/tokens'

function initials(name) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

export default function Home() {
  const router = useRouter()
  const user = getCurrentUser()
  const displayName = user?.name?.trim() || user?.email?.split('@')[0] || 'there'
  const firstName = displayName.split(' ')[0]
  const [notifCount, setNotifCount] = useState(0)
  const [products, setProducts] = useState(DEFAULT_PRODUCTS)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const loadData = useCallback(async () => {
    await Promise.all([
      unreadCount().then(setNotifCount),
      listProducts().then(setProducts).catch(() => {}),
    ])
  }, [])
  const { refreshing, onRefresh } = usePullToRefresh(loadData)

  useFocusEffect(useCallback(() => {
    unreadCount().then(setNotifCount)
  }, []))

  useEffect(() => {
    listProducts().then(setProducts).catch(() => {})
  }, [])

  // Tiles are built entirely from GET /products — an inactive product's tile doesn't render at
  // all, an active-but-not-live one renders with a "Soon" badge and no navigation.
  const quickActions = useMemo(
    () => products
      .filter(p => p.status === 'active')
      .map(p => {
        const meta = PRODUCT_TILES[p.name.toLowerCase()]
        return meta ? { ...meta, soon: p.availability !== 'live' } : null
      })
      .filter(Boolean),
    [products]
  )

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl, gap: 14 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => setDrawerOpen(true)} hitSlop={8} style={styles.menuBtn}>
            <Icon name="menu" size={22} color={colors.textDark} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Namaste, {firstName}</Text>
            <Text style={styles.title}>Where to next?</Text>
          </View>
          <View style={styles.headerRight}>
            <Pressable onPress={() => router.push('/notifications')} hitSlop={8} style={styles.bellBtn}>
              <Icon name="bell" size={20} color={colors.textDark} />
              {notifCount > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{notifCount > 9 ? '9+' : notifCount}</Text>
                </View>
              )}
            </Pressable>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(displayName)}</Text>
            </View>
          </View>
        </View>

        <Pressable style={styles.searchBar} onPress={() => router.push('/search')}>
          <Icon name="search" size={16} color={colors.primary} />
          <Text style={styles.searchBarText}>Search destinations, hotels…</Text>
        </Pressable>

        <View style={styles.actionGrid}>
          {quickActions.map(a => (
            <Pressable
              key={a.key}
              style={[styles.actionTile, { backgroundColor: a.bg }, a.bordered && styles.actionTileBordered]}
              onPress={a.soon ? undefined : (a.route ? () => router.push(a.route) : undefined)}
            >
              <Icon name={a.icon} size={20} color={a.soon ? colors.textFaint : a.color} />
              <Text style={[styles.actionLabel, { color: a.soon ? colors.textFaint : a.color }]}>{a.label}</Text>
              {a.soon && (
                <View style={styles.soonBadge}>
                  <Text style={styles.soonBadgeText}>Soon</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>

        <View>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Holiday deals</Text>
            <Text style={styles.seeAll}>See all</Text>
          </View>
          <View style={styles.dealCard}>
            <View style={styles.dealImage}>
              <Icon name="beach" size={30} color={colors.primary} />
              <View style={styles.curatedBadge}>
                <Text style={styles.curatedBadgeText}>Curated</Text>
              </View>
            </View>
            <View style={styles.dealBody}>
              <Text style={styles.dealTitle}>Bali · 5 nights</Text>
              <Text style={styles.dealSub}>Flights + hotel + visa from ₹58,999</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <AppDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  menuBtn: { marginRight: spacing.sm },
  greeting: { fontSize: 12, color: colors.textFaint },
  title: { fontFamily: fonts.heading, fontSize: 19, fontWeight: '500', color: colors.textDark, marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  bellBtn: { position: 'relative' },
  bellBadge: { position: 'absolute', top: -4, right: -6, minWidth: 15, height: 15, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderWidth: 1.5, borderColor: colors.cream },
  bellBadgeText: { fontSize: 9, fontWeight: '700', color: colors.onDark },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13, fontWeight: '500', color: colors.onDark },

  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10 },
  searchBarText: { fontSize: 13, color: colors.textFaint },

  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionTile: { width: '31%', alignItems: 'center', paddingVertical: 12, borderRadius: radius.md, position: 'relative' },
  actionTileBordered: { borderWidth: 1, borderColor: colors.border },
  actionLabel: { marginTop: 5, fontSize: 11 },
  soonBadge: { position: 'absolute', top: 6, right: 6, backgroundColor: colors.accent, borderRadius: radius.pill, paddingHorizontal: 5, paddingVertical: 1 },
  soonBadgeText: { fontSize: 8, fontWeight: '700', color: colors.accentText },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
  sectionTitle: { fontFamily: fonts.heading, fontSize: 15, fontWeight: '500', color: colors.textDark },
  seeAll: { fontSize: 12, color: colors.primary },

  dealCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden' },
  dealImage: { height: 90, backgroundColor: colors.pinkBg, alignItems: 'center', justifyContent: 'center' },
  curatedBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: colors.accent, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  curatedBadgeText: { fontSize: 11, color: colors.accentText },
  dealBody: { padding: 12 },
  dealTitle: { fontSize: 13, fontWeight: '500', color: colors.textDark },
  dealSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
})
