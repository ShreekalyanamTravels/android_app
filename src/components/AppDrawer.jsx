import { useEffect, useRef, useState } from 'react'
import { Modal, View, Text, Pressable, StyleSheet, Animated, Dimensions } from 'react-native'
import { useRouter, usePathname } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from './Icon'
import { getCurrentUser, logout } from '../services/authService'
import { colors, spacing, radius, fonts } from '../theme/tokens'

const DRAWER_WIDTH = Math.min(300, Dimensions.get('window').width * 0.82)

// Custom hand-rolled slide-in drawer (Modal + Animated, matching how every other overlay in this
// app is built) rather than @react-navigation/drawer — avoids pulling in react-native-reanimated
// just for a side menu. Opened via a hamburger button each tab screen adds to its own header.
const NAV_ITEMS = [
  { key: 'home', label: 'Home', icon: 'home', route: '/(tabs)/home' },
  { key: 'dashboard', label: 'Dashboard', icon: 'layout-grid', route: '/(tabs)/dashboard' },
  { key: 'bookings', label: 'My Bookings', icon: 'briefcase', route: '/(tabs)/bookings' },
  { key: 'profile', label: 'Profile', icon: 'user', route: '/(tabs)/profile' },
  { key: 'notifications', label: 'Notifications', icon: 'bell', route: '/notifications' },
  { key: 'wallet', label: 'Recharge Wallet', icon: 'wallet', route: '/wallet/recharge' },
  { key: 'change-password', label: 'Change Password', icon: 'lock', route: '/change-password' },
  { key: 'support', label: 'Support', icon: 'headset', route: '/(tabs)/support' },
]

function initials(name) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

export default function AppDrawer({ visible, onClose }) {
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(visible)
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current
  const user = getCurrentUser()

  useEffect(() => {
    if (visible) setMounted(true)
    Animated.timing(translateX, {
      toValue: visible ? 0 : -DRAWER_WIDTH,
      duration: 220,
      useNativeDriver: true,
    }).start(() => { if (!visible) setMounted(false) })
  }, [visible])

  function go(route) {
    onClose()
    router.push(route)
  }

  async function handleLogout() {
    onClose()
    await logout()
    router.replace('/(auth)/login')
  }

  if (!mounted) return null

  const displayName = user?.name?.trim() || user?.email?.split('@')[0] || 'there'

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={[styles.panel, { width: DRAWER_WIDTH, transform: [{ translateX }] }]}>
          <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
            <View style={styles.profileBlock}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials(displayName)}</Text>
              </View>
              <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
              {user?.email ? <Text style={styles.email} numberOfLines={1}>{user.email}</Text> : null}
            </View>

            <View style={styles.divider} />

            <View style={{ flex: 1, paddingTop: spacing.sm }}>
              {NAV_ITEMS.map(item => {
                const active = pathname === item.route.replace('/(tabs)', '')
                return (
                  <Pressable key={item.key} style={[styles.item, active && styles.itemActive]} onPress={() => go(item.route)}>
                    <Icon name={item.icon} size={18} color={active ? colors.primary : colors.textBody} />
                    <Text style={[styles.itemText, active && { color: colors.primary, fontWeight: '600' }]}>{item.label}</Text>
                  </Pressable>
                )
              })}
            </View>

            <View style={styles.divider} />
            <Pressable style={styles.item} onPress={handleLogout}>
              <Icon name="logout" size={18} color={colors.errorColor} />
              <Text style={[styles.itemText, { color: colors.errorColor }]}>Log Out</Text>
            </Pressable>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(46,40,51,0.45)' },
  panel: {
    backgroundColor: colors.white, height: '100%',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 4, height: 0 }, elevation: 10,
  },
  profileBlock: { padding: spacing.lg, paddingBottom: spacing.md },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  avatarText: { fontSize: 17, fontWeight: '600', color: colors.onDark },
  name: { fontSize: 15, fontWeight: '600', color: colors.textDark, fontFamily: fonts.bodySemiBold },
  email: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.divider },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: spacing.lg, paddingVertical: 13 },
  itemActive: { backgroundColor: colors.selectedBg },
  itemText: { fontSize: 14, color: colors.textDark, fontWeight: '500' },
})
