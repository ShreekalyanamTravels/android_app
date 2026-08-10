import { Pressable, View, StyleSheet } from 'react-native'
import ThemedText from './ThemedText'
import { colors, radius, spacing } from '../theme/tokens'

export default function PackageCard({ pkg, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}>
      <View style={styles.hero}>
        <ThemedText variant="label" style={{ color: colors.white, opacity: 0.9 }}>{pkg.theme}</ThemedText>
      </View>
      <View style={styles.body}>
        <ThemedText variant="h3" numberOfLines={1}>{pkg.title}</ThemedText>
        <ThemedText variant="muted" style={{ marginTop: 2 }} numberOfLines={1}>{pkg.destination}</ThemedText>
        <View style={styles.row}>
          <ThemedText variant="muted">{pkg.nights}N / {pkg.days}D · {pkg.hotel.stars}★ {pkg.hotel.name}</ThemedText>
        </View>
        <View style={styles.footer}>
          <ThemedText variant="muted">From</ThemedText>
          <ThemedText variant="h3" style={{ color: colors.gold }}>₹{pkg.price.toLocaleString('en-IN')}</ThemedText>
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  hero: {
    height: 90,
    backgroundColor: colors.sidebarDark,
    justifyContent: 'flex-end',
    padding: spacing.md,
  },
  body: { padding: spacing.lg },
  row: { marginTop: spacing.sm },
  footer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.creamAlt,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
})
