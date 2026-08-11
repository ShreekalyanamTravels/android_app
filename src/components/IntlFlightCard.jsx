import { useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import Icon from './Icon'
import AirlineLogo from './AirlineLogo'
import IntlSegmentRow from './IntlSegmentRow'
import { colors, spacing, radius } from '../theme/tokens'

const TONE_COLORS = {
  orange: '#f07820',
  pink: '#c9184a',
}
const AMENITY_ICONS = ['🍽', '📶', '🔌', '🎬']

// One selectable flight option in app/results-international.jsx's per-leg list — re-skinned
// sibling of results.jsx's inline flight card, same raw item shape (from normalizeFlight's source,
// i.e. the raw /flights/search result before selection), plus a `tone` for the onward/return palette.
export default function IntlFlightCard({ item, legFrom, legTo, tone = 'orange', selected, onPress, onMoreFares }) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const tint = TONE_COLORS[tone] || TONE_COLORS.orange
  const cheapestFare = item.fareOptions?.[0] || {}
  const moreFares = (item.fareOptions?.length || 1) - 1
  const segments = item.segments || []

  return (
    <Pressable style={[styles.card, selected && { borderColor: tint, backgroundColor: `${tint}0d` }]} onPress={onPress}>
      <View style={styles.topRow}>
        <AirlineLogo code={item.airCode} color={item.color} size={30} radius={8} />
        <View style={styles.airlineBlock}>
          <Text style={styles.airlineName} numberOfLines={1}>{item.airline}</Text>
          <View style={styles.amenityRow}>
            {AMENITY_ICONS.map((a, i) => <Text key={i} style={styles.amenityIcon}>{a}</Text>)}
          </View>
        </View>
      </View>

      <View style={styles.timeRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.time}>{item.dep} <Text style={styles.code}>{legFrom}</Text></Text>
        </View>
        <View style={styles.durationCol}>
          <Text style={styles.durText}>{item.dur}</Text>
          <View style={[styles.durLine, { backgroundColor: tint }]} />
          <Text style={[styles.stopsText, { color: tint }]}>{item.stopsLabel}</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text style={styles.time}>{item.arr} <Text style={styles.code}>{legTo}</Text></Text>
        </View>
      </View>

      {segments.length > 0 && (
        <Pressable style={styles.detailsToggle} onPress={() => setDetailsOpen(v => !v)} hitSlop={6}>
          <Text style={[styles.detailsToggleText, { color: tint }]}>Flight Details</Text>
          <Icon name="chevron-down" size={11} color={tint} style={{ transform: [{ rotate: detailsOpen ? '180deg' : '0deg' }] }} />
        </Pressable>
      )}

      {detailsOpen && (
        <View style={styles.accordion}>
          {segments.map((s, i) => (
            <IntlSegmentRow key={i} segment={s} tone={tone} layoverLabel={i > 0 ? s.layover : undefined} />
          ))}
        </View>
      )}

      <View style={styles.bottomRow}>
        <View style={styles.baggageRow}>
          <View style={styles.baggageItem}>
            <Icon name="bag-checked" size={12} color={colors.textMuted} />
            <Text style={styles.baggageText}>{cheapestFare.checkIn || '—'}</Text>
          </View>
          <View style={styles.baggageItem}>
            <Icon name="bag-cabin" size={12} color={colors.textMuted} />
            <Text style={styles.baggageText}>{cheapestFare.cabinBag || '—'}</Text>
          </View>
          <Text style={[styles.refundText, { color: item.refundable ? colors.successColor : colors.errorColor }]}>
            {item.refundable ? 'Refundable' : 'Non Refundable'}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.price, { color: tint }]}>₹{item.price.toLocaleString('en-IN')}</Text>
          <Text style={styles.priceSub}>per adult · incl. taxes</Text>
        </View>
      </View>

      {moreFares > 0 && (
        <Pressable style={styles.moreFaresBtn} onPress={(e) => { e.stopPropagation?.(); onMoreFares?.() }}>
          <Text style={[styles.moreFaresText, { color: tint }]}>+{moreFares} more fares</Text>
        </Pressable>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 14, marginBottom: 10 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  airlineBlock: { flex: 1, minWidth: 0 },
  airlineName: { fontSize: 12.5, fontWeight: '600', color: colors.textDark },
  amenityRow: { flexDirection: 'row', gap: 6, marginTop: 3 },
  amenityIcon: { fontSize: 11 },

  timeRow: { flexDirection: 'row', alignItems: 'center' },
  time: { fontSize: 14, fontWeight: '600', color: colors.textDark },
  code: { fontSize: 11, fontWeight: '400', color: colors.textMuted },
  durationCol: { alignItems: 'center', paddingHorizontal: 10 },
  durText: { fontSize: 10.5, fontWeight: '500', color: colors.textMuted },
  durLine: { width: 46, height: 2, borderRadius: 1, marginVertical: 4 },
  stopsText: { fontSize: 10.5, fontWeight: '600' },

  detailsToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'center', marginTop: 8 },
  detailsToggleText: { fontSize: 11, fontWeight: '700' },

  accordion: { marginTop: 8, borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 6 },

  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.divider },
  baggageRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', flex: 1 },
  baggageItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  baggageText: { fontSize: 11, color: colors.textMuted },
  refundText: { fontSize: 10.5, fontWeight: '700' },
  price: { fontSize: 16, fontWeight: '700' },
  priceSub: { fontSize: 9.5, color: colors.textFaint, marginTop: 1 },

  moreFaresBtn: { alignSelf: 'center', marginTop: 10 },
  moreFaresText: { fontSize: 11, fontWeight: '700' },
})
