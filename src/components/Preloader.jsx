import { View, Text, ActivityIndicator, StyleSheet } from 'react-native'
import { colors, spacing, fonts } from '../theme/tokens'

// Shared loading state — full-screen (default) for a page still waiting on its initial data,
// or inline (fullScreen={false}) for a section within an already-rendered page (e.g. a list
// that's mid-fetch while the rest of the screen is already up).
export default function Preloader({ label = 'Loading…', fullScreen = true, style }) {
  return (
    <View style={[fullScreen ? styles.full : styles.inline, style]}>
      <ActivityIndicator color={colors.primary} />
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  full: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream, gap: spacing.sm },
  inline: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50, gap: spacing.sm },
  label: { fontSize: 12.5, color: colors.textFaint, fontFamily: fonts.body },
})
