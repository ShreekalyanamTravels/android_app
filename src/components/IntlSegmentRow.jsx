import { View, Text, StyleSheet } from 'react-native'
import { colors, radius } from '../theme/tokens'

const TONE_COLORS = {
  orange: '#f07820',
  pink: '#c9184a',
}

// One connecting-flight segment inside a leg's expandable "Flight Details" accordion — shared
// between IntlFlightCard (per-option list) and IntlCombinedCard (the locked-in itinerary summary).
export default function IntlSegmentRow({ segment, tone = 'orange', layoverLabel }) {
  const tint = TONE_COLORS[tone] || TONE_COLORS.orange
  return (
    <View style={styles.wrap}>
      {layoverLabel && (
        <View style={styles.layoverPill}>
          <Text style={styles.layoverPillText}>⏱ {layoverLabel}</Text>
        </View>
      )}
      <View style={styles.row}>
        <View style={styles.side}>
          <Text style={styles.time}>{segment.dep}</Text>
          <Text style={[styles.code, { color: tint }]}>{segment.from}</Text>
        </View>
        <View style={styles.center}>
          <Text style={styles.dur}>{segment.dur}</Text>
          <View style={[styles.line, { backgroundColor: tint }]} />
          <Text style={styles.flightCode}>{segment.airline} {segment.code}</Text>
        </View>
        <View style={[styles.side, styles.sideRight]}>
          <Text style={styles.time}>{segment.arr}</Text>
          <Text style={[styles.code, { color: tint }]}>{segment.to}</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 8 },
  layoverPill: {
    alignSelf: 'center', backgroundColor: colors.orangeBg, borderRadius: radius.pill,
    paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8,
  },
  layoverPillText: { fontSize: 10.5, fontWeight: '600', color: colors.orangeText },
  row: { flexDirection: 'row', alignItems: 'center' },
  side: { flex: 1 },
  sideRight: { alignItems: 'flex-end' },
  time: { fontSize: 13, fontWeight: '700', color: colors.textDark },
  code: { fontSize: 10.5, fontWeight: '600', marginTop: 1 },
  center: { flex: 1.2, alignItems: 'center' },
  dur: { fontSize: 10, color: colors.textFaint },
  line: { width: 48, height: 2, borderRadius: 1, marginVertical: 3 },
  flightCode: { fontSize: 10, color: colors.textMuted },
})
