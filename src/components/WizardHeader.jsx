import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import Icon from './Icon'
import StepProgress from './StepProgress'
import { colors, fonts, spacing } from '../theme/tokens'

export default function WizardHeader({ title, subtitle, step, totalSteps = 6, onBack, right, center = true }) {
  const router = useRouter()
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pressable onPress={onBack || (() => router.back())} hitSlop={10}>
          <Icon name="chevron-left" size={20} color={colors.onDark} />
        </Pressable>
        <View style={center ? styles.titleWrapCenter : styles.titleWrap}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {right ? <View>{right}</View> : <View style={styles.spacer} />}
      </View>
      {step ? <StepProgress step={step} totalSteps={totalSteps} style={styles.barsRow} /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.primaryDark, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titleWrapCenter: { flex: 1, alignItems: 'center' },
  titleWrap: { flex: 1 },
  title: { fontFamily: fonts.heading, fontSize: 15, fontWeight: '500', color: colors.onDark },
  subtitle: { marginTop: 2, fontSize: 11, color: colors.onDarkMuted, textAlign: 'center' },
  spacer: { width: 20 },
  barsRow: { marginTop: 10 },
})
