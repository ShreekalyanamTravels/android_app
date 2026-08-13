import { Platform } from 'react-native'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { authFetch } from './authService'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return
  await Notifications.setNotificationChannelAsync('default', {
    name: 'default',
    importance: Notifications.AndroidImportance.DEFAULT,
  })
}

// Captures a real Expo push token and stores it on users.push_token. Never throws — every
// failure path (denied permission, no projectId, network error, running in Expo Go where push
// isn't supported since SDK 53) just resolves to null so callers can fire-and-forget this.
export async function registerForPushNotifications() {
  try {
    await ensureAndroidChannel()

    if (!Device.isDevice) return null

    const existing = await Notifications.getPermissionsAsync()
    let status = existing.status
    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync()
      status = requested.status
    }
    if (status !== 'granted') return null

    const projectId = Constants.expoConfig?.extra?.eas?.projectId
    if (!projectId) return null

    const { data: pushToken } = await Notifications.getExpoPushTokenAsync({ projectId })
    if (!pushToken) return null

    await authFetch('/notifications/register-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pushToken }),
    })

    return pushToken
  } catch {
    return null
  }
}

export function subscribeToPushTokenChanges() {
  return Notifications.addPushTokenListener((event) => {
    const pushToken = event?.data
    if (!pushToken) return
    authFetch('/notifications/register-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pushToken }),
    }).catch(() => {})
  })
}
