import { useEffect } from 'react'
import { Tabs } from 'expo-router'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Icon from '../../src/components/Icon'
import { colors, fonts, radius, spacing } from '../../src/theme/tokens'
import { registerForPushNotifications, subscribeToPushTokenChanges } from '../../src/services/pushService'
import { useAppConfig } from '../../src/context/ConfigContext'

const NAV_ITEMS = [
  { key: 'bookings', label: 'Bookings', icon: 'briefcase', route: 'bookings' },
  { key: 'dashboard', label: 'Dashboard', icon: 'layout-grid', route: 'dashboard' },
  { key: 'home', label: 'Home', icon: 'home', route: 'home', fab: true },
  { key: 'profile', label: 'Profile', icon: 'user', route: 'profile' },
  { key: 'support', label: 'Support', icon: 'headset', route: 'support' },
]

function CustomTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets()
  const activeName = state.routes[state.index].name

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {NAV_ITEMS.map(item => {
        const active = activeName === item.route && !item.fab
        if (item.fab) {
          return (
            <View key={item.key} style={styles.fabSlot}>
              <Pressable style={styles.fab} onPress={() => navigation.navigate(item.route)}>
                <Icon name={item.icon} size={20} color={colors.onDark} />
              </Pressable>
            </View>
          )
        }
        return (
          <Pressable key={item.key} style={styles.tabBtn} onPress={() => navigation.navigate(item.route)}>
            <Icon name={item.icon} size={18} color={active ? colors.primary : colors.textMuted} />
            <Text style={[styles.tabLabel, { color: active ? colors.primary : colors.textMuted }]}>{item.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export default function TabsLayout() {
  const config = useAppConfig()
  const pushEnabled = config.featureFlags.pushNotifications

  useEffect(() => {
    if (!pushEnabled) return
    registerForPushNotifications()
    const sub = subscribeToPushTokenChanges()
    return () => sub.remove()
  }, [pushEnabled])

  return (
    <Tabs tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="dashboard" />
      <Tabs.Screen name="bookings" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="support" />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'flex-end', backgroundColor: colors.white,
    borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, paddingHorizontal: spacing.sm,
  },
  tabBtn: { flex: 1, alignItems: 'center', gap: 3 },
  tabLabel: { fontFamily: fonts.bodyMedium, fontSize: 10.5 },
  fabSlot: { flex: 1, alignItems: 'center' },
  fab: {
    width: 52, height: 52, borderRadius: 26, marginTop: -28,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 4, borderColor: colors.cream,
  },
})
