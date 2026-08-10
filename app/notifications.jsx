import { useCallback, useState } from 'react'
import { View, Text, Pressable, StyleSheet, ScrollView, RefreshControl } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from '../src/components/Icon'
import Preloader from '../src/components/Preloader'
import { listNotifications, markAllRead, markRead } from '../src/services/notificationsService'
import { usePullToRefresh } from '../src/hooks/usePullToRefresh'
import { NOTIF_TONE } from '../src/data/notificationsData'
import { colors, spacing, radius, fonts } from '../src/theme/tokens'

function formatTime(iso) {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now - d
  const diffH = Math.floor(diffMs / 3600000)
  if (diffH < 1) return 'Just now'
  if (diffH < 24) return `${diffH}h ago`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7) return `${diffD}d ago`
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

export default function Notifications() {
  const router = useRouter()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(() => listNotifications().then(setItems).finally(() => setLoading(false)), [])
  const { refreshing, onRefresh } = usePullToRefresh(loadData)

  useFocusEffect(useCallback(() => { loadData() }, [loadData]))

  async function handleMarkAllRead() {
    await markAllRead()
    listNotifications().then(setItems)
  }

  async function handleOpen(n) {
    if (!n.read) {
      await markRead(n.id)
      listNotifications().then(setItems)
    }
  }

  const hasUnread = items.some(n => !n.read)

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Icon name="chevron-left" size={20} color={colors.onDark} />
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 20 }} />
      </View>

      {hasUnread && (
        <Pressable style={styles.markAllRow} onPress={handleMarkAllRead}>
          <Text style={styles.markAllText}>Mark all as read</Text>
        </Pressable>
      )}

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm, paddingBottom: spacing.xxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {loading ? (
          <Preloader fullScreen={false} />
        ) : items.length === 0 ? (
          <View style={styles.emptyBox}>
            <Icon name="bell" size={22} color={colors.textFaint} />
            <Text style={styles.emptyText}>No notifications yet.</Text>
          </View>
        ) : items.map(n => {
          const tone = NOTIF_TONE[n.tone]
          return (
            <Pressable key={n.id} style={[styles.row, !n.read && styles.rowUnread]} onPress={() => handleOpen(n)}>
              <View style={[styles.iconBox, { backgroundColor: tone.bg }]}>
                <Icon name={n.icon} size={16} color={tone.fg} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.titleRow}>
                  <Text style={styles.title} numberOfLines={1}>{n.title}</Text>
                  {!n.read && <View style={styles.dot} />}
                </View>
                <Text style={styles.message}>{n.message}</Text>
                <Text style={styles.time}>{formatTime(n.time)}</Text>
              </View>
            </Pressable>
          )
        })}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.primaryDark, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  headerTitle: { fontFamily: fonts.heading, fontSize: 16, fontWeight: '500', color: colors.onDark },

  markAllRow: { alignItems: 'flex-end', paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  markAllText: { fontSize: 12, fontWeight: '600', color: colors.primary },

  emptyBox: { alignItems: 'center', gap: 8, paddingVertical: 60 },
  emptyText: { fontSize: 13, color: colors.textFaint },

  row: { flexDirection: 'row', gap: 10, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12 },
  rowUnread: { backgroundColor: colors.selectedBg, borderColor: colors.primary },
  iconBox: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.textDark },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary },
  message: { fontSize: 12, color: colors.textBody, marginTop: 2, lineHeight: 16 },
  time: { fontSize: 10.5, color: colors.textFaint, marginTop: 4 },
})
