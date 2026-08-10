import { View, StyleSheet } from 'react-native'
import { colors, radius, spacing } from '../theme/tokens'

export default function Card({ style, children, ...rest }) {
  return <View style={[styles.card, style]} {...rest}>{children}</View>
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
})
