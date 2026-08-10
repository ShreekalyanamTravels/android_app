import { Stack } from 'expo-router'
import { colors } from '../../src/theme/tokens'

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cream } }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  )
}
