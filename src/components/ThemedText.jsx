import { Text } from 'react-native'
import { colors, fonts } from '../theme/tokens'

const VARIANTS = {
  h1: { fontFamily: fonts.headingBold, fontSize: 30, color: colors.textDark },
  h2: { fontFamily: fonts.heading, fontSize: 22, color: colors.textDark },
  h3: { fontFamily: fonts.heading, fontSize: 18, color: colors.textDark },
  body: { fontFamily: fonts.body, fontSize: 14, color: colors.textBody },
  bodyMedium: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textBody },
  label: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.textMuted, letterSpacing: 0.4, textTransform: 'uppercase' },
  muted: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
}

export default function ThemedText({ variant = 'body', style, children, ...rest }) {
  return <Text style={[VARIANTS[variant], style]} {...rest}>{children}</Text>
}
