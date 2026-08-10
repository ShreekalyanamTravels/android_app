export const NOTIFICATIONS = [
  {
    id: 'n1', icon: 'check', tone: 'success',
    title: 'Booking confirmed', message: 'Your Jaipur ⇄ New Delhi trip is confirmed. PNR sent to your email.',
    time: '2026-07-01T08:07:00', read: false,
  },
  {
    id: 'n2', icon: 'wallet', tone: 'info',
    title: 'Wallet top-up received', message: '₹20,000 added to your wallet via UPI.',
    time: '2026-06-28T11:20:00', read: false,
  },
  {
    id: 'n3', icon: 'clock', tone: 'pending',
    title: 'Fare hold expiring soon', message: 'Your held booking to Dubai will release in 24 hours unless paid.',
    time: '2026-06-28T09:00:00', read: false,
  },
  {
    id: 'n4', icon: 'plane', tone: 'info',
    title: 'Check-in reminder', message: 'Online check-in opens 48 hours before your Mumbai flight.',
    time: '2026-06-25T18:00:00', read: true,
  },
  {
    id: 'n5', icon: 'shield-check', tone: 'success',
    title: 'Policy issued', message: 'Travel insurance policy HDFC-TRV-2026-00412 has been issued.',
    time: '2026-06-16T09:35:00', read: true,
  },
]

export const NOTIF_TONE = {
  success: { fg: '#2E7D3E', bg: '#E1F0E4' },
  info: { fg: '#A91F42', bg: '#F9E1E4' },
  pending: { fg: '#8A4A12', bg: '#FBEBD9' },
}
