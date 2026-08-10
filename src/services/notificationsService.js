import { NOTIFICATIONS } from '../data/notificationsData'

let notifications = [...NOTIFICATIONS]

export async function listNotifications() {
  return Promise.resolve([...notifications].sort((a, b) => new Date(b.time) - new Date(a.time)))
}

export async function unreadCount() {
  return Promise.resolve(notifications.filter(n => !n.read).length)
}

export async function markAllRead() {
  notifications = notifications.map(n => ({ ...n, read: true }))
  return Promise.resolve(notifications)
}

export async function markRead(id) {
  notifications = notifications.map(n => (n.id === id ? { ...n, read: true } : n))
  return Promise.resolve(notifications)
}
