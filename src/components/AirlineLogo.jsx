import { useState } from 'react'
import { View, Text, Image, StyleSheet } from 'react-native'
import { getServerOrigin } from '../services/apiClient'

// Mirrors the web app's AirlineLogo — /airline_icons/{code}.png served from the backend, falling
// back to a colored circle with the airline code when the image 404s (not every carrier has an
// icon file) or when no code is available at all.
export default function AirlineLogo({ code, color = '#555555', size = 38, radius = 10, style }) {
  const [failed, setFailed] = useState(false)

  if (!code || failed) {
    return (
      <View style={[styles.fallback, { width: size, height: size, borderRadius: radius, backgroundColor: color }, style]}>
        <Text style={[styles.fallbackText, { fontSize: size * 0.32 }]}>{code || '?'}</Text>
      </View>
    )
  }

  return (
    <Image
      source={{ uri: `${getServerOrigin()}/airline_icons/${code}.png` }}
      onError={() => setFailed(true)}
      style={[styles.logo, { width: size, height: size, borderRadius: radius }, style]}
      resizeMode="contain"
    />
  )
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  fallbackText: { fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  logo: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#f0ecea', flexShrink: 0 },
})
