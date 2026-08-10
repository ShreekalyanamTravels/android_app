import { useEffect, useRef } from 'react'
import { Animated, StyleSheet, Text } from 'react-native'
import { colors, radius, spacing } from '../theme/tokens'

// Mount conditionally with a changing `key` (e.g. key={toast.id}) so repeated identical messages
// still replay the animation instead of no-op'ing on an already-mounted instance.
export default function Toast({ message, onHide, duration = 2500 }) {
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start()
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => onHide?.())
    }, duration)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Animated.View style={[styles.toast, { opacity }]} pointerEvents="none">
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: 40,
    backgroundColor: colors.textDark, borderRadius: radius.md,
    paddingVertical: 12, paddingHorizontal: 16,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  text: { color: colors.onDark, fontSize: 13, textAlign: 'center' },
})
