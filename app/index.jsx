import { Redirect } from 'expo-router'
import { isAuthenticated } from '../src/services/authService'

export default function Index() {
  return <Redirect href={isAuthenticated() ? '/(tabs)/home' : '/(auth)/login'} />
}
