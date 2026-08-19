import { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import ThemedText from './ThemedText'
import Button from './Button'
import BrandLogo from './BrandLogo'
import Icon from './Icon'
import { colors, spacing } from '../theme/tokens'

// Full-screen block used for maintenanceMode and forceUpdate/minSupportedVersion gating from
// /app-config — both are meant to be temporary, so "Check Again" re-runs the same loadConfig()
// the app already calls at startup, letting the user get back in without relaunching once the
// flag is cleared server-side.
export default function GateScreen({ icon, title, message, config, onRetry }) {
  const [checking, setChecking] = useState(false)

  async function handleRetry() {
    setChecking(true)
    await onRetry()
    setChecking(false)
  }

  return (
    <View style={[styles.root, config.branding.backgroundColor && { backgroundColor: config.branding.backgroundColor }]}>
      <BrandLogo uri={config.branding.logoUrl} style={styles.logo} />
      <View style={styles.iconWrap}>
        <Icon name={icon} size={28} color={config.branding.primaryColor || colors.primary} />
      </View>
      <ThemedText variant="h2" style={styles.title}>{title}</ThemedText>
      <ThemedText variant="muted" style={styles.message}>{message}</ThemedText>
      <Button
        label={checking ? 'Checking…' : 'Check Again'}
        loading={checking}
        onPress={handleRetry}
        style={{ marginTop: spacing.xl, backgroundColor: config.branding.primaryColor || colors.primary }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream, padding: spacing.xl },
  logo: { width: 160, height: 72, marginBottom: spacing.xxl },
  iconWrap: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: colors.creamAlt,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg,
  },
  title: { textAlign: 'center' },
  message: { textAlign: 'center', marginTop: spacing.sm, maxWidth: 300 },
})
