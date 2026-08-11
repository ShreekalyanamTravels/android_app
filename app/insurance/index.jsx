import { useMemo, useState } from 'react'
import { View, Text, Pressable, StyleSheet, ScrollView, Modal } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from '../../src/components/Icon'
import { colors, spacing, radius, fonts } from '../../src/theme/tokens'

const INS_TYPES = ['Individual', 'Family Floater', 'Annual Multitrip']
const RELATIONSHIPS = ['Spouse', 'Son', 'Daughter', 'Father', 'Mother', 'Brother', 'Sister', 'Other']
const FAMILY_MIN = 2
const FAMILY_MAX = 6

const COUNTRIES = [
  'India', 'United Arab Emirates', 'United Kingdom', 'United States', 'Singapore', 'Thailand',
  'Malaysia', 'Sri Lanka', 'Nepal', 'Maldives', 'Australia', 'Canada', 'Germany', 'France',
  'Japan', 'South Korea', 'Indonesia', 'Vietnam', 'Philippines', 'New Zealand', 'Switzerland',
  'Italy', 'Spain', 'Greece', 'Turkey', 'Egypt', 'South Africa', 'Kenya', 'Bahrain', 'Qatar', 'Oman',
]

function pad2(n) { return String(n).padStart(2, '0') }

function formatDate(d) {
  return {
    label: `${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'short' })}'${String(d.getFullYear()).slice(2)}`,
    iso: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
  }
}

function parseIso(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatDobDisplay(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}-${m}-${y}`
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function dateOptions(minIso, count = 120) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = minIso && minIso > formatDate(today).iso ? parseIso(minIso) : today
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return formatDate(d)
  })
}

export default function InsuranceSearch() {
  const router = useRouter()

  const [insType, setInsType] = useState('')
  const [insFrom, setInsFrom] = useState('India')
  const [insDest, setInsDest] = useState('')
  const [startDate, setStartDate] = useState(null)
  const [endDate, setEndDate] = useState(null)
  const [persons, setPersons] = useState(1)
  const [travellers, setTravellers] = useState([{ relationship: 'Self', dob: '' }])
  const [error, setError] = useState('')

  const [listPicker, setListPicker] = useState(null) // { title, options, onSelect, onClose }
  const [personsOpen, setPersonsOpen] = useState(false)

  const [activeDobTraveller, setActiveDobTraveller] = useState(null)
  const [dobModalOpen, setDobModalOpen] = useState(false)
  const [dobViewDate, setDobViewDate] = useState(new Date())

  const noOfDays = startDate && endDate
    ? Math.max(0, Math.round((parseIso(endDate.iso) - parseIso(startDate.iso)) / 86400000))
    : 0

  const destOptions = useMemo(() => COUNTRIES.filter(c => c !== insFrom), [insFrom])

  function updateTraveller(i, field, value) {
    setTravellers(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: value } : t))
  }

  function resizeTravellers(count) {
    setTravellers(prev => {
      const next = [...prev]
      while (next.length < count) next.push({ relationship: '', dob: '' })
      while (next.length > count) next.pop()
      if (next[0]) next[0] = { ...next[0], relationship: 'Self' }
      return next
    })
  }

  function bumpFamilyPersons(delta) {
    setPersons(p => {
      const next = Math.max(FAMILY_MIN, Math.min(FAMILY_MAX, p + delta))
      resizeTravellers(next)
      return next
    })
  }

  function openDobPicker(i) {
    const existing = travellers[i]?.dob
    const base = existing ? parseIso(existing) : (() => { const d = new Date(); d.setFullYear(d.getFullYear() - 25); return d })()
    setDobViewDate(new Date(base.getFullYear(), base.getMonth(), 1))
    setActiveDobTraveller(i)
    setPersonsOpen(false)
    setDobModalOpen(true)
  }

  function closeDobPicker() {
    setDobModalOpen(false)
    setActiveDobTraveller(null)
    setPersonsOpen(true)
  }

  function pickDobYear() {
    const nowYear = new Date().getFullYear()
    const years = Array.from({ length: 100 }, (_, k) => nowYear - k)
    setDobModalOpen(false)
    setListPicker({
      title: 'Select year',
      options: years.map(y => ({ label: String(y), value: y })),
      onSelect: y => { setDobViewDate(d => new Date(y, d.getMonth(), 1)); setDobModalOpen(true) },
      onClose: () => setDobModalOpen(true),
    })
  }

  function pickDobMonth() {
    setDobModalOpen(false)
    setListPicker({
      title: 'Select month',
      options: MONTH_NAMES.map((m, idx) => ({ label: m, value: idx })),
      onSelect: idx => { setDobViewDate(d => new Date(d.getFullYear(), idx, 1)); setDobModalOpen(true) },
      onClose: () => setDobModalOpen(true),
    })
  }

  function selectDobDay(day) {
    if (!day || activeDobTraveller === null) return
    const d = new Date(dobViewDate.getFullYear(), dobViewDate.getMonth(), day)
    const iso = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
    updateTraveller(activeDobTraveller, 'dob', iso)
    closeDobPicker()
  }

  function renderDobField(i, style) {
    const val = travellers[i]?.dob
    return (
      <Pressable style={[styles.dobRow, style]} onPress={() => openDobPicker(i)}>
        <Text style={[styles.dobDisplay, !val && styles.fieldPlaceholder]}>
          {val ? formatDobDisplay(val) : 'Select Date of Birth'}
        </Text>
        <Icon name="calendar" size={16} color={colors.textFaint} />
      </Pressable>
    )
  }

  function openTypePicker() {
    setListPicker({
      title: 'Select insurance type',
      options: INS_TYPES.map(t => ({ label: t, value: t })),
      onSelect: v => {
        setInsType(v)
        setError('')
        if (v === 'Individual' || v === 'Annual Multitrip') {
          setPersons(1)
          setTravellers([{ relationship: 'Self', dob: '' }])
        } else if (v === 'Family Floater') {
          setPersons(FAMILY_MIN)
          setTravellers([{ relationship: 'Self', dob: '' }, { relationship: '', dob: '' }])
        }
      },
    })
  }

  function openCountryPicker(title, options, onSelect) {
    setListPicker({ title, options: options.map(c => ({ label: c, value: c })), onSelect })
  }

  function openDatePicker(title, minIso, onSelect) {
    setListPicker({
      title,
      options: dateOptions(minIso).map(d => ({ label: d.label, value: d })),
      onSelect,
    })
  }

  function getQuotes() {
    if (!insType) return setError('Please select an insurance type.')
    if (!insDest) return setError('Please select the travelling country.')
    if (!startDate) return setError('Please select the start date.')
    if (!endDate) return setError('Please select the end date.')
    if (parseIso(endDate.iso) < parseIso(startDate.iso)) return setError('End date must be on or after the start date.')
    if ((insType === 'Individual' || insType === 'Annual Multitrip') && !travellers[0]?.dob) return setError('Please enter the traveller\'s date of birth.')
    if (insType === 'Family Floater') {
      if (travellers.some(t => !t.dob)) return setError('Please enter date of birth for all travellers.')
      if (travellers.slice(1).some(t => !t.relationship)) return setError('Please select relationship for all additional travellers.')
    }
    setError('')
    router.push({
      pathname: '/insurance/plans',
      params: {
        type: insType, from: insFrom, dest: insDest,
        start: startDate.iso, end: endDate.iso,
        days: String(noOfDays), persons: String(persons),
        travellers: JSON.stringify(travellers),
      },
    })
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={styles.hero}>
          <View style={styles.heroRow}>
            <Pressable onPress={() => router.back()} hitSlop={10}>
              <Icon name="chevron-left" size={20} color={colors.onDark} />
            </Pressable>
            <Text style={styles.heroTitle}>Travel Insurance</Text>
            <View style={{ width: 20 }} />
          </View>
        </View>

        <View style={styles.card}>
          <Pressable style={styles.fieldRow} onPress={openTypePicker}>
            <Icon name="shield-check" size={18} color={colors.textFaint} style={{ marginTop: 3 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>INSURANCE TYPE</Text>
              <Text style={[styles.fieldValue, !insType && styles.fieldPlaceholder]}>{insType || 'Select Type'}</Text>
            </View>
            <Icon name="chevron-down" size={14} color={colors.textFaint} style={{ marginTop: 3 }} />
          </Pressable>

          <Pressable
            style={[styles.fieldRow, styles.divider]}
            onPress={() => openCountryPicker('Default from country', COUNTRIES, v => { setInsFrom(v); if (v === insDest) setInsDest('') })}
          >
            <Icon name="globe" size={18} color={colors.textFaint} style={{ marginTop: 3 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>DEFAULT FROM COUNTRY</Text>
              <Text style={styles.fieldValue}>{insFrom}</Text>
            </View>
            <Icon name="chevron-down" size={14} color={colors.textFaint} style={{ marginTop: 3 }} />
          </Pressable>

          <Pressable
            style={[styles.fieldRow, styles.divider]}
            onPress={() => openCountryPicker('Travelling country', destOptions, v => { setInsDest(v); setError('') })}
          >
            <Icon name="globe" size={18} color={colors.textFaint} style={{ marginTop: 3 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>TRAVELLING COUNTRIES</Text>
              <Text style={[styles.fieldValue, !insDest && styles.fieldPlaceholder]}>{insDest || 'Select Country'}</Text>
            </View>
            <Icon name="chevron-down" size={14} color={colors.textFaint} style={{ marginTop: 3 }} />
          </Pressable>

          <View style={[styles.divider, styles.twoCol]}>
            <Pressable
              style={[styles.colLeft, { flexDirection: 'row', gap: 10 }]}
              onPress={() => openDatePicker('Select start date', null, d => { setStartDate(d); if (endDate && parseIso(endDate.iso) < parseIso(d.iso)) setEndDate(null); setError('') })}
            >
              <Icon name="calendar" size={18} color={colors.textFaint} style={{ marginTop: 3 }} />
              <View>
                <Text style={styles.fieldLabel}>START DATE</Text>
                <Text style={[styles.fieldValue, !startDate && styles.fieldPlaceholder]}>{startDate?.label || 'Select Date'}</Text>
              </View>
            </Pressable>
            <Pressable
              style={[styles.colRight, { flexDirection: 'row', gap: 10 }]}
              onPress={() => openDatePicker('Select end date', startDate?.iso, d => { setEndDate(d); setError('') })}
            >
              <Icon name="calendar" size={18} color={colors.textFaint} style={{ marginTop: 3 }} />
              <View>
                <Text style={styles.fieldLabel}>END DATE</Text>
                <Text style={[styles.fieldValue, !endDate && styles.fieldPlaceholder]}>{endDate?.label || 'Select Date'}</Text>
              </View>
            </Pressable>
          </View>

          <View style={[styles.divider, styles.twoCol]}>
            <View style={[styles.colLeft, { flexDirection: 'row', gap: 10 }]}>
              <Icon name="calendar" size={18} color={colors.textFaint} style={{ marginTop: 3 }} />
              <View>
                <Text style={styles.fieldLabel}>NO OF DAYS</Text>
                <Text style={styles.fieldValue}>{noOfDays > 0 ? noOfDays : '—'}</Text>
              </View>
            </View>
            <Pressable
              style={[styles.colRight, { flexDirection: 'row', gap: 10 }]}
              onPress={() => setPersonsOpen(true)}
            >
              <Icon name="users" size={18} color={colors.textFaint} style={{ marginTop: 3 }} />
              <View>
                <Text style={styles.fieldLabel}>NO OF PERSONS</Text>
                <Text style={styles.fieldValue}>{persons} Passenger{persons > 1 ? 's' : ''}</Text>
              </View>
            </Pressable>
          </View>
        </View>

        {error ? <Text style={styles.validationError}>{error}</Text> : null}

        <Pressable style={styles.getQuotesBtn} onPress={getQuotes}>
          <Text style={styles.getQuotesBtnText}>Get Quotes</Text>
        </Pressable>
      </ScrollView>

      <Modal
        visible={!!listPicker}
        transparent
        animationType="slide"
        onRequestClose={() => { listPicker?.onClose?.(); setListPicker(null) }}
      >
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => { listPicker?.onClose?.(); setListPicker(null) }} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{listPicker?.title}</Text>
              <Pressable onPress={() => { listPicker?.onClose?.(); setListPicker(null) }} hitSlop={10}>
                <Icon name="x" size={18} color={colors.primary} />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 420 }}>
              {listPicker?.options.map((opt, i) => (
                <Pressable
                  key={i}
                  style={styles.pickerRow}
                  onPress={() => { listPicker.onSelect(opt.value); setListPicker(null) }}
                >
                  <Text style={styles.pickerRowTitle}>{opt.label}</Text>
                  <Icon name="chevron-right" size={14} color={colors.textFaint} />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={personsOpen} transparent animationType="slide" onRequestClose={() => setPersonsOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPersonsOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{insType === 'Individual' || insType === 'Family Floater' ? 'Select Travellers' : 'No of Persons'}</Text>
              <Pressable onPress={() => setPersonsOpen(false)} hitSlop={10}>
                <Icon name="x" size={18} color={colors.primary} />
              </Pressable>
            </View>

            {insType === 'Individual' ? (
              <>
                <View style={styles.travellersInfoRow}>
                  <Icon name="users" size={20} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.travellerRowLabel}>Travellers</Text>
                    <Text style={styles.travellersInfoSub}>Only one traveller allowed for this insurance type</Text>
                  </View>
                </View>

                <Text style={styles.travellersSubheading}>Traveler 1</Text>
                {renderDobField(0)}
              </>
            ) : insType === 'Family Floater' ? (
              <>
                <View style={[styles.travellersInfoRow, { alignItems: 'center' }]}>
                  <Icon name="users" size={20} color={colors.primary} />
                  <Text style={[styles.travellerRowLabel, { flex: 1 }]}>Travellers</Text>
                  <View style={styles.stepperPill}>
                    <Pressable style={[styles.stepperBtn, persons === FAMILY_MIN && styles.stepperBtnDisabled]} onPress={() => bumpFamilyPersons(-1)} hitSlop={8} disabled={persons === FAMILY_MIN}>
                      <Icon name="minus" size={13} color={persons === FAMILY_MIN ? colors.textFaint : colors.primary} />
                    </Pressable>
                    <Text style={styles.stepperCount}>{persons}</Text>
                    <Pressable style={[styles.stepperBtn, persons === FAMILY_MAX && styles.stepperBtnDisabled]} onPress={() => bumpFamilyPersons(1)} hitSlop={8} disabled={persons === FAMILY_MAX}>
                      <Icon name="plus" size={13} color={persons === FAMILY_MAX ? colors.textFaint : colors.primary} />
                    </Pressable>
                  </View>
                </View>

                <ScrollView style={{ maxHeight: 320 }}>
                  {travellers.map((t, i) => (
                    <View key={i} style={styles.familyBlock}>
                      <Text style={styles.travellersSubheading}>Traveler {i + 1}</Text>
                      <View style={styles.familyRow}>
                        {i === 0 ? (
                          <View style={[styles.relationshipBox, styles.relationshipBoxDisabled]}>
                            <Text style={styles.relationshipText}>SELF</Text>
                          </View>
                        ) : (
                          <Pressable
                            style={styles.relationshipBox}
                            onPress={() => {
                              setPersonsOpen(false)
                              setListPicker({
                                title: 'Select relationship',
                                options: RELATIONSHIPS.map(r => ({ label: r, value: r })),
                                onSelect: v => { updateTraveller(i, 'relationship', v); setPersonsOpen(true) },
                                onClose: () => setPersonsOpen(true),
                              })
                            }}
                          >
                            <Text style={[styles.relationshipText, !t.relationship && styles.fieldPlaceholder]}>{t.relationship || 'Relationship'}</Text>
                            <Icon name="chevron-down" size={13} color={colors.textFaint} />
                          </Pressable>
                        )}
                        {renderDobField(i, { flex: 1 })}
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </>
            ) : (
              <View style={styles.travellerRow}>
                <Text style={styles.travellerRowLabel}>Passengers</Text>
                <View style={styles.stepperPill}>
                  <Pressable style={[styles.stepperBtn, persons === 1 && styles.stepperBtnDisabled]} onPress={() => setPersons(p => Math.max(1, p - 1))} hitSlop={8} disabled={persons === 1}>
                    <Icon name="minus" size={13} color={persons === 1 ? colors.textFaint : colors.primary} />
                  </Pressable>
                  <Text style={styles.stepperCount}>{persons}</Text>
                  <Pressable style={[styles.stepperBtn, persons === 10 && styles.stepperBtnDisabled]} onPress={() => setPersons(p => Math.min(10, p + 1))} hitSlop={8} disabled={persons === 10}>
                    <Icon name="plus" size={13} color={persons === 10 ? colors.textFaint : colors.primary} />
                  </Pressable>
                </View>
              </View>
            )}

            <Pressable style={styles.travellersDoneBtn} onPress={() => setPersonsOpen(false)}>
              <Text style={styles.travellersDoneBtnText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={dobModalOpen} transparent animationType="slide" onRequestClose={closeDobPicker}>
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeDobPicker} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Date of Birth</Text>
              <Pressable onPress={closeDobPicker} hitSlop={10}>
                <Icon name="x" size={18} color={colors.primary} />
              </Pressable>
            </View>
            {(() => {
              const year = dobViewDate.getFullYear()
              const month = dobViewDate.getMonth()
              const firstDay = new Date(year, month, 1)
              const daysInMonth = new Date(year, month + 1, 0).getDate()
              const startingDayOfWeek = firstDay.getDay()
              const todayIso = formatDate(new Date()).iso
              const isCurrentMonth = year === new Date().getFullYear() && month === new Date().getMonth()

              const weeks = []
              let week = Array(startingDayOfWeek).fill(null)
              for (let d = 1; d <= daysInMonth; d++) {
                if (week.length === 7) { weeks.push(week); week = [] }
                week.push(d)
              }
              if (week.length) { week.push(...Array(7 - week.length).fill(null)); weeks.push(week) }

              return (
                <View>
                  <View style={styles.dobCalHeader}>
                    <Pressable onPress={() => setDobViewDate(new Date(year, month - 1, 1))} hitSlop={8}>
                      <Icon name="chevron-left" size={16} color={colors.primary} />
                    </Pressable>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Pressable style={styles.dobQuickChip} onPress={pickDobMonth}>
                        <Text style={styles.dobQuickChipText}>{dobViewDate.toLocaleDateString('en-US', { month: 'long' })}</Text>
                      </Pressable>
                      <Pressable style={styles.dobQuickChip} onPress={pickDobYear}>
                        <Text style={styles.dobQuickChipText}>{year}</Text>
                      </Pressable>
                    </View>
                    <Pressable onPress={() => !isCurrentMonth && setDobViewDate(new Date(year, month + 1, 1))} hitSlop={8} disabled={isCurrentMonth} style={{ opacity: isCurrentMonth ? 0.3 : 1 }}>
                      <Icon name="chevron-right" size={16} color={colors.primary} />
                    </Pressable>
                  </View>
                  <View style={styles.calendarWeekdays}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                      <Text key={d} style={styles.calendarWeekday}>{d}</Text>
                    ))}
                  </View>
                  {weeks.map((w, wi) => (
                    <View key={wi} style={styles.calendarWeek}>
                      {w.map((day, di) => {
                        const iso = day ? `${year}-${pad2(month + 1)}-${pad2(day)}` : null
                        const disabled = !day || iso > todayIso
                        return (
                          <Pressable
                            key={di}
                            disabled={disabled}
                            onPress={() => selectDobDay(day)}
                            style={[styles.calendarDay, day && !disabled && styles.calendarDayValid]}
                          >
                            {day ? <Text style={[styles.calendarDayText, disabled && { color: colors.textFaint }]}>{day}</Text> : <Text />}
                          </Pressable>
                        )
                      })}
                    </View>
                  ))}
                </View>
              )
            })()}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  hero: { backgroundColor: colors.primaryDark, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: 40 },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroTitle: { fontFamily: fonts.heading, fontSize: 18, fontWeight: '500', color: colors.onDark },

  card: { marginTop: -26, marginHorizontal: spacing.lg, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 14 },
  fieldRow: { flexDirection: 'row', gap: 10, paddingVertical: 12 },
  fieldLabel: { fontSize: 11, fontWeight: '500', color: colors.textFaint, letterSpacing: 0.3 },
  fieldValue: { fontSize: 16, fontWeight: '500', color: colors.textDark, marginTop: 1 },
  fieldPlaceholder: { color: colors.textMuted, fontWeight: '400' },

  divider: { borderTopWidth: 1, borderTopColor: colors.divider },
  twoCol: { flexDirection: 'row', paddingVertical: 12 },
  colLeft: { flex: 1, borderRightWidth: 1, borderRightColor: colors.divider, paddingRight: 10 },
  colRight: { flex: 1, paddingLeft: 12 },

  validationError: { color: colors.errorColor, fontSize: 12, marginTop: spacing.sm, marginHorizontal: spacing.lg, textAlign: 'center' },

  getQuotesBtn: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: radius.pill, marginTop: spacing.lg, marginHorizontal: spacing.lg },
  getQuotesBtnText: { fontSize: 14, fontWeight: '600', color: colors.onDark, letterSpacing: 0.3 },

  modalRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(46,40,51,0.45)' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider, marginBottom: 4 },
  sheetTitle: { fontSize: 14, fontWeight: '500', color: colors.textDark },

  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.divider },
  pickerRowTitle: { fontSize: 14, fontWeight: '500', color: colors.textDark },

  travellerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  travellerRowLabel: { fontSize: 14, fontWeight: '500', color: colors.textDark },

  travellersInfoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.divider },
  travellersInfoSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  travellersSubheading: { fontSize: 13, fontWeight: '600', color: colors.textDark, marginTop: spacing.md, marginBottom: 8 },
  dobRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 12 },
  dobDisplay: { fontSize: 14, color: colors.textDark },

  dobCalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, marginBottom: 8 },
  dobQuickChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.border },
  dobQuickChipText: { fontSize: 13, fontWeight: '600', color: colors.textDark },
  calendarWeekdays: { flexDirection: 'row', marginBottom: 6 },
  calendarWeekday: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', color: colors.textMuted },
  calendarWeek: { flexDirection: 'row', marginBottom: 4 },
  calendarDay: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, marginHorizontal: 2 },
  calendarDayValid: { backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.border },
  calendarDayText: { fontSize: 13, fontWeight: '500', color: colors.textDark },

  familyBlock: { marginBottom: 14 },
  familyRow: { flexDirection: 'row', gap: 10 },
  relationshipBox: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 12 },
  relationshipBoxDisabled: { backgroundColor: colors.divider },
  relationshipText: { fontSize: 13, fontWeight: '600', color: colors.textDark, letterSpacing: 0.3 },

  stepperPill: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.cream, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 6 },
  stepperBtn: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.3, borderColor: colors.primary, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  stepperBtnDisabled: { borderColor: colors.border },
  stepperCount: { fontSize: 14, fontWeight: '500', color: colors.textDark, minWidth: 14, textAlign: 'center' },

  travellersDoneBtn: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: 13, alignItems: 'center', marginTop: spacing.lg },
  travellersDoneBtnText: { fontSize: 14, fontWeight: '600', color: colors.onDark },
})
