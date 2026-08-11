import { useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import Icon from './Icon'
import AirlineLogo from './AirlineLogo'
import IntlSegmentRow from './IntlSegmentRow'
import { colors, spacing, radius, fonts } from '../theme/tokens'

const ORANGE = '#f07820'
const PINK = '#c9184a'

function LegRow({ flight, legFrom, legTo, tone, label }) {
  const [open, setOpen] = useState(false)
  const tint = tone === 'pink' ? PINK : ORANGE
  const segments = flight.segments || []
  return (
    <View>
      <View style={styles.legHeaderRow}>
        <AirlineLogo code={flight.airCode} color={flight.color} size={24} radius={7} />
        <Text style={[styles.legLabel, { color: tint }]}>{label}</Text>
        <Text style={styles.legAirline} numberOfLines={1}>{flight.airline} · {flight.flightNo}</Text>
      </View>
      <View style={styles.timeRow}>
        <Text style={styles.time}>{flight.dep} <Text style={styles.code}>{legFrom}</Text></Text>
        <View style={styles.durationCol}>
          <Text style={styles.durText}>{flight.duration}</Text>
          <View style={[styles.durLine, { backgroundColor: tint }]} />
          <Text style={[styles.stopsText, { color: tint }]}>{flight.stops}</Text>
        </View>
        <Text style={[styles.time, { textAlign: 'right' }]}>{flight.arr} <Text style={styles.code}>{legTo}</Text>{flight.arrNote ? <Text style={styles.arrNote}> {flight.arrNote}</Text> : null}</Text>
      </View>

      {segments.length > 0 && (
        <Pressable style={styles.detailsToggle} onPress={() => setOpen(v => !v)} hitSlop={6}>
          <Text style={[styles.detailsToggleText, { color: tint }]}>Flight Details</Text>
          <Icon name="chevron-down" size={11} color={tint} style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
        </Pressable>
      )}
      {open && (
        <View style={styles.accordion}>
          {segments.map((s, i) => (
            <IntlSegmentRow key={i} segment={s} tone={tone} layoverLabel={i > 0 ? s.layover : undefined} />
          ))}
        </View>
      )}
    </View>
  )
}

// The locked-in combined itinerary summary, shown once both legs (or the single leg, for one-way)
// are selected on app/results-international.jsx — visually mirrors the reference web page's
// combined outbound+return card, but built entirely from the same real selectedFlights state
// results.jsx already produces; onBookNow is the exact same bookNow() the sticky footer calls.
export default function IntlCombinedCard({ onward, returnFlight, legFrom, legTo, retLegFrom, retLegTo, totalLabel, total, booking, onBookNow }) {
  return (
    <View style={styles.card}>
      <View style={styles.badgeRow}>
        <View style={styles.badge}>
          <Icon name="shield-check" size={11} color={ORANGE} />
          <Text style={styles.badgeText}>Your selected itinerary</Text>
        </View>
      </View>

      <LegRow flight={onward} legFrom={legFrom} legTo={legTo} tone="orange" label="ONWARD" />

      {returnFlight && (
        <>
          <View style={styles.divider} />
          <LegRow flight={returnFlight} legFrom={retLegFrom} legTo={retLegTo} tone="pink" label="RETURN" />
        </>
      )}

      <View style={styles.footer}>
        <View>
          <Text style={styles.price}>₹{total.toLocaleString('en-IN')}</Text>
          <Text style={styles.priceSub}>{totalLabel || 'per adult · incl. taxes'}</Text>
        </View>
        <Pressable style={[styles.bookBtn, booking && { opacity: 0.6 }]} onPress={onBookNow} disabled={booking}>
          <Text style={styles.bookBtnText}>{booking ? 'Please wait…' : 'Book Now'}</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: ORANGE, borderRadius: radius.lg, padding: 14, marginBottom: 14 },

  badgeRow: { marginBottom: 10 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: `${ORANGE}14`, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 10.5, fontWeight: '700', color: ORANGE },

  legHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  legLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.3 },
  legAirline: { flex: 1, fontSize: 11.5, color: colors.textMuted },

  timeRow: { flexDirection: 'row', alignItems: 'center' },
  time: { flex: 1, fontSize: 14.5, fontWeight: '600', color: colors.textDark },
  code: { fontSize: 11, fontWeight: '400', color: colors.textMuted },
  arrNote: { fontSize: 10, color: colors.textFaint },
  durationCol: { alignItems: 'center', paddingHorizontal: 10 },
  durText: { fontSize: 10.5, fontWeight: '500', color: colors.textMuted },
  durLine: { width: 46, height: 2, borderRadius: 1, marginVertical: 4 },
  stopsText: { fontSize: 10.5, fontWeight: '600' },

  detailsToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'center', marginTop: 8 },
  detailsToggleText: { fontSize: 11, fontWeight: '700' },
  accordion: { marginTop: 8, borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 6 },

  divider: { borderTopWidth: 1, borderTopColor: colors.divider, marginVertical: 12 },

  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.divider },
  price: { fontSize: 19, fontWeight: '800', color: ORANGE },
  priceSub: { fontSize: 10.5, color: colors.textFaint, marginTop: 1 },
  bookBtn: { backgroundColor: ORANGE, paddingHorizontal: 22, paddingVertical: 11, borderRadius: radius.pill },
  bookBtnText: { fontSize: 13.5, fontWeight: '700', color: colors.white },
})
