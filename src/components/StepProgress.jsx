import { View, StyleSheet } from 'react-native'
import { colors } from '../theme/tokens'

export default function StepProgress({ step, totalSteps = 6, style }) {
  return (
    <View style={[styles.barsRow, style]}>
      {Array.from({ length: totalSteps }, (_, i) => (
        <View key={i} style={[styles.bar, { backgroundColor: i < step ? colors.accent : colors.primaryDarker }]} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  barsRow: { flexDirection: 'row', gap: 3 },
  bar: { flex: 1, height: 3, borderRadius: 2 },
})
