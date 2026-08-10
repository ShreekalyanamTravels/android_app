import { Platform } from 'react-native'

export const colors = {
  // brand
  gold: '#A91F42',
  goldDark: '#7C1733',
  goldLight: '#DD8140',
  sidebarDark: '#7C1733',
  cream: '#FAF5EC',
  creamAlt: '#F0E4D8',
  border: '#EAD9CE',
  border2: '#E8DCC8',
  textDark: '#2E2833',
  textBody: '#5F584D',
  textMuted: '#8A7F70',
  white: '#FFFFFF',
  success: { bg: '#E1F0E4', fg: '#2E7D3E' },
  pending: { bg: '#FBEBD9', fg: '#8A4A12' },
  error:   { bg: '#FCE4E4', fg: '#C24545' },
  info:    { bg: '#F9E1E4', fg: '#A91F42' },

  // new corporate-flow tokens
  primary: '#A91F42',
  primaryDark: '#7C1733',
  primaryDarker: '#93203F',
  accent: '#DD8140',
  accentText: '#FFF6EC',
  textFaint: '#A89C8D',
  borderLight: '#C9B8A4',
  divider: '#F0E4D8',
  label: '#B5661F',
  onDark: '#FDEDF0',
  onDarkMuted: '#E8A9B8',
  onDarkMuted2: '#F1B8C6',
  selectedBg: '#FFF9F2',
  pinkBg: '#F9E1E4',
  orangeBg: '#FBEBD9',
  orangeText: '#8A4A12',
  successColor: '#47A25B',
  errorColor: '#C24545',
}

export const fonts = {
  heading: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, serif' }),
  headingBold: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, serif' }),
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
}

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  pill: 999,
}
