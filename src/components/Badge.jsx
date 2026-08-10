import { View, StyleSheet } from 'react-native'
import ThemedText from './ThemedText'
import { colors, radius, spacing } from '../theme/tokens'

// tone: 'success' | 'pending' | 'error' | 'info'
export default function Badge({ label, tone = 'info', style }) {
  const pair = colors[tone] || colors.info
  return (
    <View style={[styles.badge, { backgroundColor: pair.bg }, style]}>
      <ThemedText variant="bodyMedium" style={{ fontSize: 11, color: pair.fg }}>{label}</ThemedText>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
})
