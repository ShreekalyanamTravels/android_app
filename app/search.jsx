import { useEffect, useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Switch, Modal, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from '../src/components/Icon'
import StepProgress from '../src/components/StepProgress'
import { AIRPORTS, registerAirport } from '../src/data/flightsData'
import { searchCities } from '../src/services/flightsService'
import { colors, spacing, radius, fonts } from '../src/theme/tokens'

const TRIP_TYPES = [
  { key: 'oneway', label: 'ONE WAY', icon: 'plane' },
  { key: 'roundtrip', label: 'ROUND TRIP', icon: 'arrows-up-down' },
  { key: 'multicity', label: 'MULTI CITY', icon: 'route' },
]

function pad2(n) { return String(n).padStart(2, '0') }

function addDays(base, n) {
  const d = new Date(base)
  d.setDate(d.getDate() + n)
  return d
}

// Derives the compact "28/07/2026" date display string plus ISO for ordering checks
function formatPickerDate(d) {
  return {
    date: `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`,
    dateNote: `${d.toLocaleDateString('en-US', { weekday: 'short' })} '${String(d.getFullYear()).slice(2)}`,
    full: d.toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }),
    iso: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
  }
}

function parseIso(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function dateOptions(minIso, count = 90) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = minIso && minIso > formatPickerDate(today).iso ? parseIso(minIso) : today
  return Array.from({ length: count }, (_, i) => formatPickerDate(addDays(start, i)))
}

function getNextMultiCityLeg(previousLeg, index) {
  // Chains off the previous leg's arrival city (a real multi-city itinerary flies on from
  // wherever the last leg landed) but never invents a destination — that's left for the user.
  const from = previousLeg?.to || ''
  const baseDate = previousLeg?.iso ? addDays(parseIso(previousLeg.iso), 1) : addDays(new Date(), index + 1)
  const d = formatPickerDate(baseDate)
  return { from, to: '', date: d.date, dateNote: d.dateNote, iso: d.iso }
}

function isValidMultiCityLeg(leg, index, legs) {
  if (!leg?.from || !leg?.to) return false
  if (leg.from === leg.to) return false
  if (index > 0 && leg.iso && legs[index - 1]?.iso && leg.iso < legs[index - 1].iso) return false
  return true
}

// No prefilled route — from/to start blank so the user always picks their own cities. Dates still
// default to a couple of weeks out purely as a sane starting point for the date pickers.
function emptyLeg(offset) {
  const d = formatPickerDate(addDays(new Date(), offset))
  return { from: '', to: '', date: d.date, dateNote: d.dateNote, iso: d.iso }
}
const DEFAULT_ROUTE = (() => {
  const dep = emptyLeg(12)
  const ret = formatPickerDate(addDays(new Date(), 13))
  return { ...dep, returnDate: ret.date, returnIso: ret.iso }
})()
const MAX_MULTICITY_LEGS = 5
const DEFAULT_LEGS = [emptyLeg(12), emptyLeg(15)]
const AIRPORT_LIST = Object.values(AIRPORTS)

const TRAVELLER_TYPES = [
  { key: 'adults', label: 'Adults', sub: '12 Years & above', min: 1 },
  { key: 'children', label: 'Children', sub: '2 - 12 Years', min: 0 },
  { key: 'infants', label: 'Infant', sub: '0 - 23 Months', min: 0 },
]

const CABIN_CLASSES = ['Economy', 'Premium Economy', 'Business Class', 'First Class']

export default function Search() {
  const router = useRouter()
  const [tripType, setTripType] = useState('oneway')
  const [route, setRoute] = useState(DEFAULT_ROUTE)
  const [legs, setLegs] = useState(DEFAULT_LEGS)
  const [directFlight, setDirectFlight] = useState(false)
  const [travellers, setTravellers] = useState({ adults: 1, children: 0, infants: 0 })
  const [cabinClass, setCabinClass] = useState('Economy')
  const [travellersModalOpen, setTravellersModalOpen] = useState(false)
  const [airportPicker, setAirportPicker] = useState(null)
  const [airportQuery, setAirportQuery] = useState('')
  const [citySearchResults, setCitySearchResults] = useState([])
  const [citySearching, setCitySearching] = useState(false)
  const [datePicker, setDatePicker] = useState(null)
  const [multiCityError, setMultiCityError] = useState('')

  // Debounced live autosuggest — only queries once there's enough to search on, so every
  // keystroke on a 1-character query doesn't hit the API.
  useEffect(() => {
    const q = airportQuery.trim()
    if (!airportPicker || q.length < 2) {
      setCitySearchResults([])
      setCitySearching(false)
      return
    }
    setCitySearching(true)
    const timer = setTimeout(() => {
      searchCities(q)
        .then(setCitySearchResults)
        .catch(() => setCitySearchResults([]))
        .finally(() => setCitySearching(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [airportQuery, airportPicker])

  function swap() {
    setRoute(r => ({ ...r, from: r.to, to: r.from }))
  }

  function swapLeg(index) {
    setLegs(ls => ls.map((l, i) => i === index ? { ...l, from: l.to, to: l.from } : l))
  }

  function updateLeg(index, field, value) {
    setLegs(ls => ls.map((l, i) => i === index ? { ...l, [field]: value } : l))
    setMultiCityError('')
  }

  function addLeg() {
    setLegs(ls => {
      if (ls.length >= MAX_MULTICITY_LEGS) return ls
      const last = ls[ls.length - 1]
      return [...ls, getNextMultiCityLeg(last, ls.length)]
    })
    setMultiCityError('')
  }

  function removeLeg(index) {
    setLegs(ls => ls.length <= 2 ? ls : ls.filter((_, i) => i !== index))
    setMultiCityError('')
  }

  function pickAirport(title, onSelect) {
    setAirportQuery('')
    setAirportPicker({ title, onSelect })
  }

  function pickDate(title, minIso, onSelect) {
    setDatePicker({ title, minIso, onSelect })
  }

  function bumpTraveller(key, min, delta) {
    setTravellers(t => ({ ...t, [key]: Math.max(min, Math.min(9, t[key] + delta)) }))
  }

  function searchFlights() {
    if (tripType === 'multicity') {
      const valid = legs.every((leg, index) => isValidMultiCityLeg(leg, index, legs))
      if (!valid) {
        setMultiCityError('Choose a different departure and arrival city for each leg and keep dates in order.')
        return
      }
      setMultiCityError('')
      router.push({
        pathname: '/results',
        params: {
          tripType,
          legs: JSON.stringify(legs.map(l => ({ from: l.from, to: l.to, date: l.date }))),
          adults: String(travellers.adults),
          children: String(travellers.children),
          infants: String(travellers.infants),
          cabinClass,
        },
      })
      return
    }
    router.push({
      pathname: '/results',
      params: {
        tripType,
        from: route.from,
        to: route.to,
        date: route.date,
        returnDate: tripType === 'roundtrip' ? route.returnDate : '',
        adults: String(travellers.adults),
        children: String(travellers.children),
        infants: String(travellers.infants),
        cabinClass,
      },
    })
  }

  const fromAirport = AIRPORTS[route.from]
  const toAirport = AIRPORTS[route.to]

  const travellersLabel = [
    travellers.adults > 0 ? `${travellers.adults} Adult${travellers.adults > 1 ? 's' : ''}` : '',
    travellers.children > 0 ? `${travellers.children} Child${travellers.children > 1 ? 'ren' : ''}` : '',
    travellers.infants > 0 ? `${travellers.infants} Infant${travellers.infants > 1 ? 's' : ''}` : '',
  ].filter(Boolean).join(', ')

  const isMultiCitySearchValid = tripType === 'multicity' ? legs.every((leg, index) => isValidMultiCityLeg(leg, index, legs)) : true
  const isRouteValid = tripType === 'multicity' ? true : !!(route.from && route.to && route.from !== route.to)
  const canSearch = tripType === 'multicity' ? isMultiCitySearchValid : isRouteValid

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={styles.hero}>
          <View style={styles.heroRow}>
            <Pressable onPress={() => router.back()} hitSlop={10}>
              <Icon name="chevron-left" size={20} color={colors.onDark} />
            </Pressable>
            <Text style={styles.heroTitle}>Search Flight</Text>
            <View style={{ width: 20 }} />
          </View>

          <View style={styles.tripToggle}>
            {TRIP_TYPES.map(t => (
              <Pressable
                key={t.key}
                onPress={() => {
                  setTripType(t.key)
                  if (t.key !== 'multicity') setMultiCityError('')
                }}
                style={[styles.tripPill, tripType === t.key ? styles.tripPillActive : styles.tripPillInactive]}
              >
                <Icon name={t.icon} size={13} color={tripType === t.key ? colors.onDark : colors.primaryDark} />
                <Text style={[styles.tripPillText, { color: tripType === t.key ? colors.onDark : colors.primaryDark }]}>{t.label}</Text>
              </Pressable>
            ))}
          </View>

          <StepProgress step={1} style={{ marginTop: 18 }} />
        </View>

        <View style={styles.card}>
          {tripType === 'multicity' ? (
            <>
              <View style={styles.multiCityList}>
                {legs.map((leg, i) => {
                  const legFrom = AIRPORTS[leg.from]
                  const legTo = AIRPORTS[leg.to]
                  return (
                    <View key={i} style={styles.multiLegRow}>
                      <Pressable style={styles.multiRoutePair} onPress={() => pickAirport('Select departure city', code => updateLeg(i, 'from', code))}>
                        {legFrom ? (
                          <>
                            <Text style={styles.multiRouteText}>{legFrom.city}</Text>
                            <Text style={styles.multiRouteCode}>{legFrom.code}</Text>
                          </>
                        ) : (
                          <Text style={[styles.multiRouteText, { color: colors.textMuted }]}>From</Text>
                        )}
                      </Pressable>

                      <Pressable style={styles.multiSwapBtn} onPress={() => swapLeg(i)} hitSlop={6}>
                        <Icon name="arrows-up-down" size={12} color={colors.primary} />
                      </Pressable>

                      <Pressable style={styles.multiRoutePair} onPress={() => pickAirport('Select arrival city', code => updateLeg(i, 'to', code))}>
                        {legTo ? (
                          <>
                            <Text style={styles.multiRouteText}>{legTo.city}</Text>
                            <Text style={styles.multiRouteCode}>{legTo.code}</Text>
                          </>
                        ) : (
                          <Text style={[styles.multiRouteText, { color: colors.textMuted }]}>To</Text>
                        )}
                      </Pressable>

                      <Pressable style={styles.multiDateField} onPress={() => pickDate('Select departure date', i > 0 ? legs[i - 1].iso : null, d => setLegs(ls => ls.map((l, idx) => idx === i ? { ...l, date: d.date, dateNote: d.dateNote, iso: d.iso } : l)))}>
                        <Text style={styles.multiDateText}>{leg.date}</Text>
                        <Icon name="calendar" size={11} color={colors.textFaint} />
                      </Pressable>

                      {legs.length > 2 && (
                        <Pressable style={styles.multiDeleteBtn} onPress={() => removeLeg(i)} hitSlop={6}>
                          <Icon name="x" size={14} color={colors.errorColor} />
                        </Pressable>
                      )}
                    </View>
                  )
                })}
              </View>

              {legs.length < MAX_MULTICITY_LEGS && (
                <Pressable style={styles.addCityBtn} onPress={addLeg}>
                  <Text style={styles.addCityBtnText}>+ Add City</Text>
                </Pressable>
              )}

              {tripType === 'multicity' && multiCityError ? <Text style={styles.validationError}>{multiCityError}</Text> : null}

              <Pressable style={[styles.searchBtn, !isMultiCitySearchValid && { opacity: 0.5 }]} onPress={searchFlights} disabled={!isMultiCitySearchValid}>
                <Text style={styles.searchBtnText}>Search Flights</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                style={styles.routeRow}
                onPress={() => pickAirport('Select departure city', code => setRoute(r => ({ ...r, from: code })))}
              >
                <Icon name="plane-departure" size={18} color={colors.textFaint} style={{ marginTop: 3 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>FROM</Text>
                  {fromAirport ? (
                    <>
                      <Text style={styles.routeCity}>{fromAirport.city} <Text style={styles.routeCode}>{fromAirport.code}</Text></Text>
                      <Text style={styles.routeAirport}>{fromAirport.airport}</Text>
                    </>
                  ) : (
                    <Text style={[styles.routeCity, { color: colors.textMuted }]}>Select departure city</Text>
                  )}
                </View>
                <Icon name="chevron-down" size={14} color={colors.textFaint} style={{ marginTop: 3 }} />
              </Pressable>

              <View style={styles.divider}>
                <Pressable style={styles.swapBtn} onPress={swap} hitSlop={8}>
                  <Icon name="arrows-up-down" size={15} color={colors.primary} />
                </Pressable>
              </View>

              <Pressable
                style={[styles.routeRow, { paddingVertical: 12 }]}
                onPress={() => pickAirport('Select arrival city', code => setRoute(r => ({ ...r, to: code })))}
              >
                <Icon name="plane-arrival" size={18} color={colors.textFaint} style={{ marginTop: 3 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>TO</Text>
                  {toAirport ? (
                    <>
                      <Text style={styles.routeCity}>{toAirport.city} <Text style={styles.routeCode}>{toAirport.code}</Text></Text>
                      <Text style={styles.routeAirport}>{toAirport.airport}</Text>
                    </>
                  ) : (
                    <Text style={[styles.routeCity, { color: colors.textMuted }]}>Select arrival city</Text>
                  )}
                </View>
                <Icon name="chevron-down" size={14} color={colors.textFaint} style={{ marginTop: 3 }} />
              </Pressable>

              <View style={[styles.divider, styles.twoCol]}>
                <Pressable
                  style={[styles.colLeft, { flexDirection: 'row', gap: 10 }]}
                  onPress={() => pickDate('Select departure date', null, d => setRoute(r => ({ ...r, date: d.date, dateNote: d.dateNote, iso: d.iso })))}
                >
                  <Icon name="calendar" size={18} color={colors.textFaint} style={{ marginTop: 3 }} />
                  <View>
                    <Text style={styles.fieldLabel}>DEPARTURE DATE</Text>
                    <Text style={styles.routeCity}>{route.date} <Text style={styles.routeCode}>{route.dateNote}</Text></Text>
                  </View>
                </Pressable>
                <View style={styles.colRight}>
                  {tripType === 'roundtrip' ? (
                    <Pressable onPress={() => pickDate('Select return date', route.iso, d => setRoute(r => ({ ...r, returnDate: d.date, returnIso: d.iso })))}>
                      <Text style={styles.fieldLabel}>RETURN DATE</Text>
                      <Text style={styles.routeCity}>{route.returnDate}</Text>
                    </Pressable>
                  ) : (
                    <Pressable onPress={() => setTripType('roundtrip')}>
                      <Text style={styles.fieldLabel}>BOOK RETURN</Text>
                      <Text style={styles.bookReturnHint}>Save more on Round Trip!!</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </>
          )}

          <Pressable
            style={[styles.divider, { flexDirection: 'row', gap: 10, paddingVertical: 12, alignItems: 'center' }]}
            onPress={() => setTravellersModalOpen(true)}
          >
            <Icon name="users" size={18} color={colors.textFaint} style={{ marginTop: 3 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>TRAVELLERS | ONWARD CLASS</Text>
              <Text style={styles.routeCity}>{travellersLabel} | {cabinClass}</Text>
            </View>
            <Icon name="chevron-down" size={14} color={colors.textFaint} />
          </Pressable>

          <View style={[styles.divider, styles.fareTypeRow]}>
            <Text style={styles.fareTypeLabel}>Fare Type:</Text>
            <View style={styles.fareTypePill}>
              <View style={styles.fareTypeDot}>
                <View style={styles.fareTypeDotInner} />
              </View>
              <Text style={styles.fareTypePillText}>Regular</Text>
            </View>
          </View>

          <View style={[styles.divider, styles.directFlightRow]}>
            <Text style={styles.directFlightLabel}>Show Direct Flights</Text>
            <Switch
              value={directFlight}
              onValueChange={setDirectFlight}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>
        </View>

        {tripType !== 'multicity' && multiCityError ? <Text style={styles.validationError}>{multiCityError}</Text> : null}

        {tripType !== 'multicity' && (
          <Pressable style={[styles.searchBtn, !canSearch && { opacity: 0.5 }]} onPress={searchFlights} disabled={!canSearch}>
            <Text style={styles.searchBtnText}>Search Flights</Text>
          </Pressable>
        )}
      </ScrollView>

      <Modal visible={travellersModalOpen} transparent animationType="slide" onRequestClose={() => setTravellersModalOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setTravellersModalOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Travellers & Travel Class</Text>
              <Pressable onPress={() => setTravellersModalOpen(false)} hitSlop={10}>
                <Icon name="x" size={18} color={colors.primary} />
              </Pressable>
            </View>

            <Text style={styles.travellersSubheading}>Select the number of travellers</Text>

            {TRAVELLER_TYPES.map((t, i) => (
              <View key={t.key} style={[styles.travellerRow, i < TRAVELLER_TYPES.length - 1 && styles.travellerRowDivider]}>
                <View>
                  <Text style={styles.travellerRowLabel}>{t.label}</Text>
                  <Text style={styles.travellerRowSub}>{t.sub}</Text>
                  <Text style={styles.travellerRowSub}>On the day of travel</Text>
                </View>
                <View style={styles.stepperPill}>
                  <Pressable
                    style={[styles.stepperBtn, travellers[t.key] === t.min && styles.stepperBtnDisabled]}
                    onPress={() => bumpTraveller(t.key, t.min, -1)}
                    hitSlop={8}
                    disabled={travellers[t.key] === t.min}
                  >
                    <Icon name="minus" size={13} color={travellers[t.key] === t.min ? colors.textFaint : colors.primary} />
                  </Pressable>
                  <Text style={styles.stepperCount}>{travellers[t.key]}</Text>
                  <Pressable
                    style={[styles.stepperBtn, travellers[t.key] === 9 && styles.stepperBtnDisabled]}
                    onPress={() => bumpTraveller(t.key, t.min, 1)}
                    hitSlop={8}
                    disabled={travellers[t.key] === 9}
                  >
                    <Icon name="plus" size={13} color={travellers[t.key] === 9 ? colors.textFaint : colors.primary} />
                  </Pressable>
                </View>
              </View>
            ))}

            <Text style={styles.travellersSubheading}>Onward Cabin Class</Text>
            <View style={styles.cabinGrid}>
              {CABIN_CLASSES.map(c => (
                <Pressable
                  key={c}
                  style={[styles.cabinPill, cabinClass === c && styles.cabinPillActive]}
                  onPress={() => setCabinClass(c)}
                >
                  <Text style={[styles.cabinPillText, { color: cabinClass === c ? colors.onDark : colors.primary }]}>{c}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable style={styles.travellersDoneBtn} onPress={() => setTravellersModalOpen(false)}>
              <Text style={styles.travellersDoneBtnText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={!!airportPicker} transparent animationType="slide" onRequestClose={() => setAirportPicker(null)}>
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setAirportPicker(null)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{airportPicker?.title}</Text>
              <Pressable onPress={() => setAirportPicker(null)} hitSlop={10}>
                <Icon name="x" size={18} color={colors.primary} />
              </Pressable>
            </View>
            <View style={styles.searchBar}>
              <Icon name="search" size={15} color={colors.primary} />
              <TextInput
                value={airportQuery}
                onChangeText={setAirportQuery}
                placeholder="Type city or airport code"
                placeholderTextColor={colors.textFaint}
                autoFocus
                style={styles.searchInput}
              />
            </View>
            <ScrollView style={{ maxHeight: 380 }}>
              {airportQuery.trim().length >= 2 && citySearching ? (
                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : airportQuery.trim().length >= 2 && citySearchResults.length === 0 ? (
                <Text style={styles.pickerRowSub}>No airports found for "{airportQuery.trim()}"</Text>
              ) : null}
              {(airportQuery.trim().length >= 2 ? citySearchResults : AIRPORT_LIST.filter(a => {
                const q = airportQuery.trim().toLowerCase()
                if (!q) return true
                return a.city.toLowerCase().includes(q) || a.code.toLowerCase().includes(q) || a.airport.toLowerCase().includes(q)
              })).map(a => (
                <Pressable
                  key={a.code}
                  style={styles.pickerRow}
                  onPress={() => { registerAirport(a); airportPicker.onSelect(a.code); setAirportPicker(null) }}
                >
                  <View>
                    <Text style={styles.pickerRowTitle}>{a.city} <Text style={styles.routeCode}>{a.code}</Text></Text>
                    <Text style={styles.pickerRowSub}>{a.airport}</Text>
                  </View>
                  <Icon name="chevron-right" size={14} color={colors.textFaint} />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={!!datePicker} transparent animationType="slide" onRequestClose={() => setDatePicker(null)}>
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setDatePicker(null)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{datePicker?.title}</Text>
              <Pressable onPress={() => setDatePicker(null)} hitSlop={10}>
                <Icon name="x" size={18} color={colors.primary} />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 420, paddingHorizontal: spacing.lg }}>
              {datePicker && <CalendarPicker minIso={datePicker.minIso} onSelect={(d) => { datePicker.onSelect(d); setDatePicker(null) }} />}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )}
function CalendarPicker({ minIso, onSelect }) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date()
    if (minIso) {
      const minDate = parseIso(minIso)
      return minDate > today ? minDate : today
    }
    return today
  })

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDayOfWeek = firstDay.getDay()

  const weeks = []
  let currentWeek = Array(startingDayOfWeek).fill(null)
  for (let d = 1; d <= daysInMonth; d++) {
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
    currentWeek.push(d)
  }
  if (currentWeek.length > 0) {
    currentWeek.push(...Array(7 - currentWeek.length).fill(null))
    weeks.push(currentWeek)
  }

  const handleSelectDate = (day) => {
    if (!day) return
    const date = new Date(year, month, day)
    const formatted = formatPickerDate(date)
    onSelect(formatted)
  }

  return (
    <View>
      <View style={styles.calendarHeader}>
        <Pressable onPress={() => setCurrentMonth(new Date(year, month - 1))} hitSlop={8}>
          <Icon name="chevron-left" size={18} color={colors.primary} />
        </Pressable>
        <Text style={styles.calendarTitle}>{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text>
        <Pressable onPress={() => setCurrentMonth(new Date(year, month + 1))} hitSlop={8}>
          <Icon name="chevron-right" size={18} color={colors.primary} />
        </Pressable>
      </View>
      <View style={styles.calendarWeekdays}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <Text key={day} style={styles.calendarWeekday}>{day}</Text>
        ))}
      </View>
      {weeks.map((week, weekIndex) => (
        <View key={weekIndex} style={styles.calendarWeek}>
          {week.map((day, dayIndex) => (
            <Pressable
              key={dayIndex}
              style={[styles.calendarDay, day && styles.calendarDayValid]}
              onPress={() => handleSelectDate(day)}
              disabled={!day}
            >
              {day ? <Text style={styles.calendarDayText}>{day}</Text> : <Text />}
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  hero: { backgroundColor: colors.primaryDark, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: 40 },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroTitle: { fontFamily: fonts.heading, fontSize: 18, fontWeight: '500', color: colors.onDark },
  tripToggle: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginTop: 18 },
  tripPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 11, paddingVertical: 9, borderRadius: radius.pill },
  tripPillActive: { backgroundColor: colors.primary },
  tripPillInactive: { backgroundColor: colors.onDark },
  tripPillText: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.2 },

  card: { marginTop: -26, marginHorizontal: spacing.lg, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 14 },
  routeRow: { flexDirection: 'row', gap: 10, paddingBottom: 12 },
  fieldLabel: { fontSize: 11, fontWeight: '500', color: colors.textFaint, letterSpacing: 0.3 },
  routeCity: { fontSize: 16, fontWeight: '500', color: colors.textDark, marginTop: 1 },
  routeCode: { fontSize: 12, fontWeight: '400', color: colors.textMuted },
  routeAirport: { fontSize: 11, color: colors.textFaint, marginTop: 1 },

  divider: { borderTopWidth: 1, borderTopColor: colors.divider, position: 'relative' },
  swapBtn: { position: 'absolute', right: 4, top: -17, width: 34, height: 34, borderRadius: 17, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },

  legBlock: { paddingTop: 4 },
  legBlockHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10 },
  legBlockTitle: { fontSize: 10.5, fontWeight: '700', color: colors.primary, letterSpacing: 0.4 },
  multiCityHeader: { paddingBottom: 10 },
  multiCityTag: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: colors.cream, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 8 },
  multiCityTagText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  multiCitySubText: { fontSize: 12, color: colors.textMuted, lineHeight: 18 },
  multiCityList: { gap: 8 },
  multiLegRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 10, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  multiLegRowFirst: { marginBottom: 4 },
  multiRoutePair: { flex: 1, alignItems: 'flex-start' },
  multiRouteText: { fontSize: 13, fontWeight: '500', color: colors.textDark },
  multiRouteCode: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  multiSwapBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  multiDateField: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: colors.cream, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  multiDateText: { fontSize: 12, fontWeight: '500', color: colors.textDark },
  multiDeleteBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.pinkBg },
  addCityBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 10, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.cream },
  addCityBtnText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  legSwapBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  addLegBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, marginTop: 10, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cream },
  addLegBtnText: { fontSize: 12.5, fontWeight: '600', color: colors.primary },

  twoCol: { flexDirection: 'row', paddingVertical: 12 },
  colLeft: { flex: 1, borderRightWidth: 1, borderRightColor: colors.divider, paddingRight: 10 },
  colRight: { flex: 1, paddingLeft: 12, justifyContent: 'center' },
  bookReturnHint: { fontSize: 12, color: colors.textMuted, marginTop: 1 },

  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepperBtn: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.3, borderColor: colors.primary, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  stepperBtnDisabled: { borderColor: colors.border },
  stepperCount: { fontSize: 14, fontWeight: '500', color: colors.textDark, minWidth: 14, textAlign: 'center' },

  fareTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  fareTypeLabel: { fontSize: 13, fontWeight: '600', color: colors.textDark },
  fareTypePill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 8 },
  fareTypeDot: { width: 13, height: 13, borderRadius: 7, borderWidth: 2, borderColor: colors.onDark, alignItems: 'center', justifyContent: 'center' },
  fareTypeDotInner: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.onDark },
  fareTypePillText: { fontSize: 12.5, fontWeight: '700', color: colors.onDark },

  directFlightRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12,
  },
  directFlightLabel: { fontSize: 13, fontWeight: '500', color: colors.textDark },

  searchBtn: { flexDirection: 'row', gap: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: radius.pill, marginTop: spacing.lg, marginHorizontal: spacing.lg },
  searchBtnText: { fontSize: 14, fontWeight: '600', color: colors.onDark, letterSpacing: 0.3 },
  validationError: { color: colors.errorColor, fontSize: 12, marginTop: spacing.sm, marginHorizontal: spacing.lg, textAlign: 'center' },

  modalRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(46,40,51,0.45)' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider, marginBottom: 4 },
  sheetTitle: { fontSize: 14, fontWeight: '500', color: colors.textDark },

  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 8 },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: colors.textDark, padding: 0 },

  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.divider },
  pickerRowTitle: { fontSize: 14, fontWeight: '500', color: colors.textDark },
  pickerRowSub: { fontSize: 11, color: colors.textFaint, marginTop: 2 },

  travellersSubheading: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginTop: spacing.md, marginBottom: 4 },

  travellerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  travellerRowDivider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  travellerRowLabel: { fontSize: 14, fontWeight: '500', color: colors.textDark },
  travellerRowSub: { fontSize: 11, color: colors.textFaint, marginTop: 2 },

  stepperPill: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.cream, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 6 },

  cabinGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.sm },
  cabinPill: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.pill, borderWidth: 1.3, borderColor: colors.primary },
  cabinPillActive: { backgroundColor: colors.primary },
  cabinPillText: { fontSize: 12.5, fontWeight: '600' },

  travellersDoneBtn: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: 13, alignItems: 'center', marginTop: spacing.lg },
  travellersDoneBtnText: { fontSize: 14, fontWeight: '600', color: colors.onDark },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, marginBottom: 12 },
  calendarTitle: { fontSize: 14, fontWeight: '600', color: colors.textDark },
  calendarWeekdays: { flexDirection: 'row', marginBottom: 8, paddingHorizontal: 4 },
  calendarWeekday: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', color: colors.textMuted },
  calendarWeek: { flexDirection: 'row', marginBottom: 6, paddingHorizontal: 4 },
  calendarDay: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, marginHorizontal: 2 },
  calendarDayValid: { backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.border },
  calendarDayText: { fontSize: 13, fontWeight: '500', color: colors.textDark },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, marginBottom: 12 },
  calendarTitle: { fontSize: 14, fontWeight: '600', color: colors.textDark },
  calendarWeekdays: { flexDirection: 'row', marginBottom: 8 },
  calendarWeekday: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', color: colors.textMuted },
  calendarWeek: { flexDirection: 'row', marginBottom: 4 },
  calendarDay: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, marginHorizontal: 2 },
  calendarDayValid: { backgroundColor: colors.cream },
  calendarDayText: { fontSize: 13, fontWeight: '500', color: colors.textDark },
})
