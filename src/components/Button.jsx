import { Pressable, ActivityIndicator, StyleSheet } from 'react-native'
import ThemedText from './ThemedText'
import { colors, radius, spacing } from '../theme/tokens'

// variant: 'primary' | 'ghost'
export default function Button({ label, onPress, variant = 'primary', disabled = false, loading = false, style }) {
  const isPrimary = variant === 'primary'
  const textColor = isPrimary ? colors.white : colors.gold
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.ghost,
        (disabled || loading) && styles.disabled,
        pressed && !disabled && !loading && { opacity: 0.85 },
        style,
      ]}
    >
      {loading && <ActivityIndicator size="small" color={textColor} style={{ marginRight: spacing.sm }} />}
      <ThemedText variant="bodyMedium" style={{ color: textColor, fontSize: 14 }}>
        {label}
      </ThemedText>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: colors.gold },
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.gold },
  disabled: { opacity: 0.5 },
})
