import { useEffect, useCallback, useState } from 'react'
import { Stack } from 'expo-router'
import './global.css'
import { StatusBar } from 'expo-status-bar'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import * as SplashScreen from 'expo-splash-screen'
import Constants from 'expo-constants'
import { useFonts, CormorantGaramond_600SemiBold, CormorantGaramond_700Bold } from '@expo-google-fonts/cormorant-garamond'
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter'
import { restoreSession } from '../src/services/authService'
import { colors, spacing } from '../src/theme/tokens'
import { ConfigProvider, useAppConfig, useRefreshConfig } from '../src/context/ConfigContext'
import BrandLogo from '../src/components/BrandLogo'
import GateScreen from '../src/components/GateScreen'
import { isVersionBelow } from '../src/utils/version'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  return (
    <ConfigProvider>
      <AppShell />
    </ConfigProvider>
  )
}

function AppShell() {
  const config = useAppConfig()
  const refreshConfig = useRefreshConfig()
  const [fontsLoaded] = useFonts({
    CormorantGaramond_600SemiBold,
    CormorantGaramond_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  })
  const [sessionLoaded, setSessionLoaded] = useState(false)

  useEffect(() => { restoreSession().finally(() => setSessionLoaded(true)) }, [])

  const onLayoutReady = useCallback(() => {
    if (!fontsLoaded || !sessionLoaded) return
    // hideAsync() fires in the same tick React swaps from the boot view to the real <Stack>
    // (which still has to navigate the initial Redirect and paint Home/Login) — calling it
    // immediately can hide the native splash a frame or two before that's actually on screen,
    // showing a blank flash in between. Two nested rAFs guarantee at least one full commit+paint
    // cycle has happened first, so the splash only comes down once there's real content behind it.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        SplashScreen.hideAsync()
      })
    })
  }, [fontsLoaded, sessionLoaded])

  useEffect(() => { onLayoutReady() }, [onLayoutReady])

  // Covers the gap before fonts/session are ready with a real branded screen instead of a blank
  // one — on native this sits behind the OS splash screen and is never actually seen, but on web
  // (where expo-splash-screen's hide/show is a no-op) this is the only thing standing between the
  // user and a blank white page.
  if (!fontsLoaded || !sessionLoaded) {
    return (
      <View style={[styles.boot, config.branding.backgroundColor && { backgroundColor: config.branding.backgroundColor }]}>
        <BrandLogo uri={config.branding.loadingLogoUrl} style={styles.bootLogo} />
        <ActivityIndicator color={config.branding.primaryColor || colors.primary} style={{ marginTop: spacing.xl }} />
      </View>
    )
  }

  if (config.maintenanceMode) {
    return (
      <GateScreen
        icon="alert-triangle"
        title="Under Maintenance"
        message="We're making some improvements. Please check back shortly."
        config={config}
        onRetry={refreshConfig}
      />
    )
  }

  const currentVersion = Constants.expoConfig?.version
  if (config.forceUpdate || isVersionBelow(currentVersion, config.minSupportedVersion)) {
    return (
      <GateScreen
        icon="download"
        title="Update Required"
        message="A new version of the app is available. Please update to continue."
        config={config}
        onRetry={refreshConfig}
      />
    )
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cream } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="package/[id]" options={{ headerShown: true, title: 'Package' }} />
        <Stack.Screen name="itinerary/[id]" options={{ headerShown: true, title: 'Your Itinerary' }} />
        <Stack.Screen name="checkout/[id]" options={{ headerShown: true, title: 'Checkout' }} />
        <Stack.Screen name="booking/[id]" options={{ headerShown: true, title: 'Booking Details' }} />
        <Stack.Screen name="search" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="change-password" options={{ headerShown: true, title: 'Change Password' }} />
        <Stack.Screen name="wallet/recharge" options={{ headerShown: true, title: 'Recharge Wallet' }} />
        <Stack.Screen name="results" />
        <Stack.Screen name="results-international" />
        <Stack.Screen name="passenger/[id]" />
        <Stack.Screen name="review/[id]" />
        <Stack.Screen name="payment/[id]" />
        <Stack.Screen name="confirmation/[id]" />
      </Stack>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  boot: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream },
  bootLogo: { width: 200, height: 90 },
})
