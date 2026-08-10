import { useState } from 'react'
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from '../../src/components/Icon'
import AppDrawer from '../../src/components/AppDrawer'
import { colors, spacing, radius, fonts } from '../../src/theme/tokens'

const OPTIONS = [
  { key: 'call', icon: 'headset', label: 'Call Support', sub: '+91 90000 11111 · 9am–9pm' },
  { key: 'mail', icon: 'mail', label: 'Email Us', sub: 'support@kalyanamtravel.com' },
  { key: 'chat', icon: 'ticket', label: 'Raise a Ticket', sub: 'Track existing requests' },
  { key: 'faq', icon: 'id', label: 'FAQs', sub: 'Booking, payments & refunds' },
]

export default function Support() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: 10 }}>
        <Pressable onPress={() => setDrawerOpen(true)} hitSlop={8} style={styles.menuBtn}>
          <Icon name="menu" size={22} color={colors.textDark} />
        </Pressable>

        <Text style={styles.title}>Support</Text>
        <Text style={styles.subtitle}>We're here to help with your bookings</Text>

        {OPTIONS.map(o => (
          <Pressable key={o.key} style={styles.row}>
            <View style={styles.iconBox}>
              <Icon name={o.icon} size={17} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>{o.label}</Text>
              <Text style={styles.rowSub}>{o.sub}</Text>
            </View>
            <Icon name="chevron-right" size={14} color={colors.textFaint} />
          </Pressable>
        ))}
      </ScrollView>

      <AppDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  menuBtn: { alignSelf: 'flex-start' },
  title: { fontFamily: fonts.heading, fontSize: 19, fontWeight: '500', color: colors.textDark },
  subtitle: { fontSize: 12, color: colors.textMuted, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12 },
  iconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.pinkBg, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 13, fontWeight: '500', color: colors.textDark },
  rowSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
})
