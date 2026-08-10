import { useEffect, useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Modal } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from '../../src/components/Icon'
import WizardHeader from '../../src/components/WizardHeader'
import Preloader from '../../src/components/Preloader'
import Toast from '../../src/components/Toast'
import { getDraft, setPassengers, setContact, setGst, setFare, legLabel } from '../../src/services/flightBookingFlow'
import { getCurrentUser } from '../../src/services/profileService'
import { getServiceFee } from '../../src/services/bookingApi'
import { listGstDetails, createGstDetails } from '../../src/services/gstService'
import { computeFlightFare } from '../../src/services/fareCalc'
import { AIRPORTS } from '../../src/data/flightsData'
import { colors, spacing, radius, fonts } from '../../src/theme/tokens'

// Actual corp-shreekalyanam brand colors, used for the fare summary sheet to match the website
const SITE = {
  orange: '#f07820',
  pink: '#c9184a',
  border: '#e8d5b8',
  dark: '#1a1a2e',
  muted: '#888888',
}

const TITLES = ['Mr', 'Ms', 'Mrs', 'Master']
const COUNTRY_CODES = ['+91', '+1', '+44', '+971', '+65']
// Matches the fixed "Issuing Country" list the backend recognizes (createBooking.ts's
// ISSUING_COUNTRY_CODE map) — picking one of these is what lets issuing_country_code get filled
// in on the booking record.
const ISSUING_COUNTRIES = ['India', 'Thailand', 'United Arab Emirates', 'Singapore', 'United Kingdom', 'United States', 'Australia', 'Germany', 'France', 'Japan']

function makeSlot(id, type) {
  return {
    id, type, title: type === 'Child' ? 'Master' : 'Mr', firstName: '', lastName: '',
    dob: '', nationality: '', passport: '', issuingCountry: '', passportExpiry: '',
  }
}

export default function PassengerDetails() {
  const router = useRouter()
  const { id } = useLocalSearchParams()
  const [draft, setDraft] = useState(null)
  const [fare, setFareState] = useState(null)
  const [slots, setSlots] = useState([])
  const [openSlotId, setOpenSlotId] = useState(null)
  const [countryCode, setCountryCode] = useState('+91')
  const [countryCodeOpen, setCountryCodeOpen] = useState(false)
  const [mobile, setMobile] = useState('')
  const [email, setEmail] = useState('')
  const [hasGST, setHasGST] = useState(false)
  const [gstList, setGstList] = useState([])
  const [gstStates, setGstStates] = useState([])
  const [gstLoaded, setGstLoaded] = useState(false)
  const [gstSelectedId, setGstSelectedId] = useState('')
  const [gstDetailSaved, setGstDetailSaved] = useState(false)
  const [gstSaving, setGstSaving] = useState(false)
  const [gstCompanyName, setGstCompanyName] = useState('')
  const [gstRegNo, setGstRegNo] = useState('')
  const [gstNo, setGstNo] = useState('')
  const [gstPin, setGstPin] = useState('')
  const [gstStateId, setGstStateId] = useState('')
  const [gstStateName, setGstStateName] = useState('')
  const [gstAddress, setGstAddress] = useState('')
  const [stateModalOpen, setStateModalOpen] = useState(false)
  const [issuingSlotId, setIssuingSlotId] = useState(null)
  const [fareModalOpen, setFareModalOpen] = useState(false)
  const [sectorOpen, setSectorOpen] = useState(false)
  const [fareCardCollapsed, setFareCardCollapsed] = useState({})
  const [toast, setToast] = useState(null)

  useEffect(() => { getDraft(id).then(setDraft) }, [id])

  useEffect(() => {
    getCurrentUser().then(u => {
      if (u.email) setEmail(u.email)
      if (u.mobile) setMobile(u.mobile)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!draft || slots.length) return
    let uid = 1
    const built = []
    for (let i = 0; i < draft.adults; i++) built.push(makeSlot(uid++, 'Adult'))
    for (let i = 0; i < draft.children; i++) built.push(makeSlot(uid++, 'Child'))
    for (let i = 0; i < draft.infants; i++) built.push(makeSlot(uid++, 'Infant'))
    setSlots(built)
    setOpenSlotId(built[0]?.id ?? null)
  }, [draft])

  // Real service-fee lookup (product/sector/booking-type keyed), then the full fare breakdown —
  // same math the review/payment screens will reuse via computeFlightFare.
  useEffect(() => {
    if (!draft) return
    const sector = draft.tripType === 'roundtrip' ? 'R' : 'O'
    const bookingType = draft.isInternational ? 'international' : 'domestic'
    const flightOnly = computeFlightFare({
      legs: draft.legs, adults: draft.adults, children: draft.children, infants: draft.infants,
      isInternational: draft.isInternational, serviceFee: 0, gstPercentage: 0,
    })
    setFareState(flightOnly)
    getServiceFee({ sector, bookingType, amount: flightOnly.totalFlightAmt })
      .then(res => setFareState(computeFlightFare({
        legs: draft.legs, adults: draft.adults, children: draft.children, infants: draft.infants,
        isInternational: draft.isInternational,
        serviceFee: Number(res.serviceFee) || 0,
        gstPercentage: res.isGst ? Number(res.gstPercentage) || 0 : 0,
      })))
      .catch(() => {})
  }, [draft])

  function showToast(message) {
    setToast({ id: Date.now(), message })
  }

  function updateSlot(slotId, patch) {
    setSlots(s => s.map(x => x.id === slotId ? { ...x, ...patch } : x))
  }

  function toggleGST() {
    setHasGST(v => {
      const next = !v
      if (next && !gstLoaded) {
        listGstDetails()
          .then(res => { setGstList(res.gsts || []); setGstStates(res.states || []) })
          .catch(() => {})
          .finally(() => setGstLoaded(true))
      }
      return next
    })
  }

  function pickSavedGst(g) {
    setGstSelectedId(g.id)
    setGstCompanyName(g.companyName || '')
    setGstRegNo(g.registrationNo || '')
    setGstNo(g.gstNumber || '')
    setGstPin(g.pincode ? String(g.pincode) : '')
    setGstStateId(g.stateId ? String(g.stateId) : '')
    setGstStateName(g.stateName || '')
    setGstAddress(g.address || '')
    setGstDetailSaved(true)
  }

  function editGstField(setter) {
    return (value) => { setter(value); setGstDetailSaved(false); setGstSelectedId('') }
  }

  async function saveGst() {
    if (!gstCompanyName || !gstRegNo || !gstNo || !gstPin || !gstStateId || !gstAddress) {
      showToast('Please fill in all GST fields')
      return
    }
    setGstSaving(true)
    try {
      await createGstDetails({
        companyName: gstCompanyName, registrationNo: gstRegNo, gstNumber: gstNo,
        pincode: gstPin, stateId: Number(gstStateId), address: gstAddress,
      })
      setGstDetailSaved(true)
      listGstDetails().then(res => setGstList(res.gsts || [])).catch(() => {})
    } catch (e) {
      showToast(e.message || 'Could not save GST details')
    } finally {
      setGstSaving(false)
    }
  }

  async function continueToReview() {
    const incomplete = slots.some(s => !s.firstName.trim() || !s.lastName.trim())
    if (incomplete) { showToast('Please fill in every traveller’s name'); return }
    if (!email.trim() || !mobile.trim()) { showToast('Please fill in your contact email and mobile'); return }

    const passengers = slots.map(s => ({
      title: s.title, firstName: s.firstName.trim(), lastName: s.lastName.trim(), type: s.type,
      ...(draft.isInternational ? {
        dob: s.dob || undefined,
        nationality: s.nationality || undefined,
        passport: s.passport || undefined,
        issuingCountry: s.issuingCountry || undefined,
        passportExpiry: s.passportExpiry || undefined,
      } : {}),
    }))

    await setPassengers(id, passengers)
    await setContact(id, { countryCode, mobile: mobile.trim(), email: email.trim() })
    await setGst(id, hasGST && gstCompanyName && gstNo
      ? { companyName: gstCompanyName, registrationNo: gstRegNo, gstNumber: gstNo, pincode: gstPin, stateName: gstStateName, address: gstAddress }
      : null)
    if (fare) await setFare(id, fare)
    router.push(`/review/${id}`)
  }

  if (!draft) {
    return <Preloader />
  }

  const routeLabel = `${draft.legs[0].from} – ${draft.legs[draft.legs.length - 1].to}`
  const dateLabel = draft.legs.map(l => l.date).join(' – ')
  const fareLabel = draft.legs.map(l => l.fareId).filter(Boolean).join(' + ')
  const totalPayable = fare?.totalPayableAmt ?? 0

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <WizardHeader title="Passenger details" subtitle="Step 3 of 6" step={3} />

      <Pressable style={styles.summaryStrip} onPress={() => setSectorOpen(v => !v)}>
        <Text style={styles.summaryText}><Text style={{ fontWeight: '500' }}>{routeLabel}</Text> · {dateLabel}{fareLabel ? ` · ${fareLabel}` : ''}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.summaryPrice}>₹{totalPayable.toLocaleString('en-IN')}</Text>
          <Icon name="chevron-down" size={13} color={colors.primaryDark} style={{ transform: [{ rotate: sectorOpen ? '180deg' : '0deg' }] }} />
        </View>
      </Pressable>

      {sectorOpen && (
        <View style={styles.sectorBox}>
          {draft.legs.map((leg, i) => (
            <SectorDetail
              key={i}
              label={`${legLabel(draft.legs.length, i)} · ${leg.date?.toUpperCase()}`}
              leg={leg}
              from={AIRPORTS[leg.from]}
              to={AIRPORTS[leg.to]}
              last={i === draft.legs.length - 1}
            />
          ))}
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}>
        {(() => {
          const typeCounters = {}
          return slots.map((slot, idx) => {
            typeCounters[slot.type] = (typeCounters[slot.type] || 0) + 1
            const label = `${slot.type} ${typeCounters[slot.type]}`
            const isOpen = slot.id === openSlotId
            const name = `${slot.firstName} ${slot.lastName}`.trim()

            if (!isOpen) {
              return (
                <Pressable key={slot.id} style={styles.collapsedRow} onPress={() => setOpenSlotId(slot.id)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{label}</Text>
                    <Text style={styles.collapsedSub}>{name || 'Tap to fill details'}</Text>
                  </View>
                  <Icon name="chevron-down" size={14} color={colors.textFaint} />
                </Pressable>
              )
            }

            return (
              <View key={slot.id} style={styles.card}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.cardTitle}>{label}</Text>
                  <Text style={styles.matchWarning}><Icon name="alert-circle" size={11} color={colors.label} /> Name must match govt ID</Text>
                </View>

                <View style={styles.titleRow}>
                  {TITLES.map(t => (
                    <Pressable key={t} style={[styles.titlePill, slot.title === t && styles.titlePillActive]} onPress={() => updateSlot(slot.id, { title: t })}>
                      <Text style={[styles.titlePillText, { color: slot.title === t ? colors.onDark : colors.textMuted }]}>{t}</Text>
                    </Pressable>
                  ))}
                </View>

                <Field label="FIRST AND MIDDLE NAME" required value={slot.firstName} onChangeText={v => updateSlot(slot.id, { firstName: v })} />
                <Field label="LAST NAME" required value={slot.lastName} onChangeText={v => updateSlot(slot.id, { lastName: v })} />

                {draft.isInternational && (
                  <>
                    <View style={styles.twoCol}>
                      <Field label="DATE OF BIRTH" placeholder="YYYY-MM-DD" value={slot.dob} onChangeText={v => updateSlot(slot.id, { dob: v })} style={{ flex: 1 }} />
                      <Field label="NATIONALITY" value={slot.nationality} onChangeText={v => updateSlot(slot.id, { nationality: v })} style={{ flex: 1 }} />
                    </View>
                    <Field label="PASSPORT NUMBER" value={slot.passport} onChangeText={v => updateSlot(slot.id, { passport: v })} autoCapitalize="characters" />
                    <View style={styles.twoCol}>
                      <SelectField label="ISSUING COUNTRY" value={slot.issuingCountry} placeholder="Select country" onPress={() => setIssuingSlotId(slot.id)} style={{ flex: 1 }} />
                      <Field label="PASSPORT EXPIRY" placeholder="YYYY-MM-DD" value={slot.passportExpiry} onChangeText={v => updateSlot(slot.id, { passportExpiry: v })} style={{ flex: 1 }} />
                    </View>
                  </>
                )}
              </View>
            )
          })
        })()}


        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contact details <Text style={styles.cardTitleMuted}>· ticket and updates sent here</Text></Text>
          <Field label="EMAIL ID" required value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <View style={styles.twoCol}>
            <SelectField label="CODE" value={countryCode} onPress={() => setCountryCodeOpen(true)} style={{ flex: 0.6 }} />
            <Field label="MOBILE NUMBER" required value={mobile} onChangeText={setMobile} keyboardType="phone-pad" style={{ flex: 1 }} />
          </View>

          <Pressable style={styles.checkboxRow} onPress={toggleGST}>
            <View style={[styles.checkbox, hasGST && styles.checkboxChecked]}>
              {hasGST && <Icon name="check" size={11} color={colors.onDark} />}
            </View>
            <Text style={styles.checkboxLabel}>
              I have a <Text style={{ color: colors.primary, fontWeight: '600' }}>GST</Text> number (Optional)
            </Text>
          </Pressable>

          {hasGST && (
            <View style={styles.gstBox}>
              {gstList.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>Select company <Text style={styles.cardTitleMuted}>(from your saved GSTs)</Text></Text>
                  <View style={styles.chipsRow}>
                    {gstList.map(g => (
                      <Pressable key={g.id} style={[styles.chip, gstSelectedId === g.id && styles.chipActive]} onPress={() => pickSavedGst(g)}>
                        {gstSelectedId === g.id && <Icon name="check" size={10} color={colors.onDark} />}
                        <Text style={[styles.chipText, gstSelectedId === g.id && { color: colors.onDark }]}>{g.companyName} ({g.gstNumber})</Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}

              <Field label="COMPANY NAME" value={gstCompanyName} onChangeText={editGstField(setGstCompanyName)} />
              <Field label="REGISTRATION NO" value={gstRegNo} onChangeText={editGstField(setGstRegNo)} />
              <Field label="GST NO" value={gstNo} onChangeText={editGstField(setGstNo)} autoCapitalize="characters" />
              <View style={styles.twoCol}>
                <Field label="PIN CODE" value={gstPin} onChangeText={editGstField(setGstPin)} keyboardType="number-pad" style={{ flex: 1 }} />
                <SelectField label="STATE" value={gstStateName} placeholder="Select State" onPress={() => setStateModalOpen(true)} style={{ flex: 1 }} />
              </View>
              <Field label="ADDRESS" value={gstAddress} onChangeText={editGstField(setGstAddress)} />

              <View style={styles.gstSaveRow}>
                <Text style={styles.gstSaveHint}>Save this GST for faster checkout next time</Text>
                {gstDetailSaved ? (
                  <View style={styles.gstSavedBadge}>
                    <Icon name="check" size={11} color={colors.successColor} />
                    <Text style={styles.gstSavedText}>GST Saved!</Text>
                  </View>
                ) : (
                  <Pressable style={styles.gstSaveBtn} onPress={saveGst} disabled={gstSaving}>
                    <Text style={styles.gstSaveBtnText}>{gstSaving ? 'Saving…' : 'Save GST Details'}</Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.footerFareBox} onPress={() => setFareModalOpen(true)}>
          <Text style={styles.footerCount}>{slots.length} traveller{slots.length > 1 ? 's' : ''}</Text>
          <View style={styles.footerFareRow}>
            <Text style={styles.footerPrice}>₹{totalPayable.toLocaleString('en-IN')}</Text>
            <Icon name="info" size={13} color={colors.textMuted} />
          </View>
        </Pressable>
        <Pressable style={styles.continueBtn} onPress={continueToReview}>
          <Text style={styles.continueBtnText}>Continue to review</Text>
          <Icon name="arrow-right" size={12} color={colors.onDark} />
        </Pressable>
      </View>

      <Modal visible={countryCodeOpen} transparent animationType="slide" onRequestClose={() => setCountryCodeOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setCountryCodeOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Country Code</Text>
              <Pressable onPress={() => setCountryCodeOpen(false)} hitSlop={10}>
                <Icon name="chevron-down" size={18} color={colors.textMuted} />
              </Pressable>
            </View>
            {COUNTRY_CODES.map(c => (
              <Pressable key={c} style={styles.stateRow} onPress={() => { setCountryCode(c); setCountryCodeOpen(false) }}>
                <Text style={[styles.stateRowText, countryCode === c && { color: colors.primary, fontWeight: '600' }]}>{c}</Text>
                {countryCode === c && <Icon name="check" size={13} color={colors.primary} />}
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>

      <Modal visible={!!issuingSlotId} transparent animationType="slide" onRequestClose={() => setIssuingSlotId(null)}>
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIssuingSlotId(null)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Issuing Country</Text>
              <Pressable onPress={() => setIssuingSlotId(null)} hitSlop={10}>
                <Icon name="chevron-down" size={18} color={colors.textMuted} />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 380 }}>
              {ISSUING_COUNTRIES.map(c => {
                const slot = slots.find(s => s.id === issuingSlotId)
                return (
                  <Pressable key={c} style={styles.stateRow} onPress={() => { updateSlot(issuingSlotId, { issuingCountry: c }); setIssuingSlotId(null) }}>
                    <Text style={[styles.stateRowText, slot?.issuingCountry === c && { color: colors.primary, fontWeight: '600' }]}>{c}</Text>
                    {slot?.issuingCountry === c && <Icon name="check" size={13} color={colors.primary} />}
                  </Pressable>
                )
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={stateModalOpen} transparent animationType="slide" onRequestClose={() => setStateModalOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setStateModalOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Select State</Text>
              <Pressable onPress={() => setStateModalOpen(false)} hitSlop={10}>
                <Icon name="chevron-down" size={18} color={colors.textMuted} />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 380 }}>
              {gstStates.map(s => (
                <Pressable
                  key={s.id}
                  style={styles.stateRow}
                  onPress={() => { setGstStateId(String(s.id)); setGstStateName(s.name); setGstDetailSaved(false); setStateModalOpen(false) }}
                >
                  <Text style={[styles.stateRowText, gstStateId === String(s.id) && { color: colors.primary, fontWeight: '600' }]}>{s.name}</Text>
                  {gstStateId === String(s.id) && <Icon name="check" size={13} color={colors.primary} />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={fareModalOpen} transparent animationType="slide" onRequestClose={() => setFareModalOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setFareModalOpen(false)} />
          <View style={styles.fareSheet}>
            <View style={styles.fareSheetHeader}>
              <Text style={styles.fareSheetTitle}>Fare Summary</Text>
              <Pressable onPress={() => setFareModalOpen(false)} hitSlop={10}>
                <Icon name="x" size={18} color={SITE.pink} />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 420 }}>
              {(fare?.legFares || []).map((leg, i) => (
                <SectorFareBlock
                  key={i}
                  leg={{ ...leg, label: legLabel(draft.legs.length, i) }}
                  serviceFee={fare.legServiceFees[i]}
                  collapsed={!!fareCardCollapsed[i]}
                  onToggle={() => setFareCardCollapsed(c => ({ ...c, [i]: !c[i] }))}
                />
              ))}

              <View style={styles.fareTotalBand}>
                <Text style={styles.fareTotalLabel}>Total Payable Amount</Text>
                <Text style={styles.fareTotalValue}>{money(totalPayable)}</Text>
              </View>
            </ScrollView>

            <Pressable style={styles.fareDoneBtn} onPress={() => setFareModalOpen(false)}>
              <Text style={styles.fareDoneBtnText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {toast ? <Toast key={toast.id} message={toast.message} onHide={() => setToast(null)} /> : null}
    </SafeAreaView>
  )
}

function SectorDetail({ label, leg, from, to, last }) {
  return (
    <View style={[styles.sectorDetailRow, !last && styles.sectorDetailDivider]}>
      <Text style={styles.sectorDetailLabel}>{label}</Text>
      <Text style={styles.sectorDetailTime}>
        {leg.dep} {from?.city} <Text style={styles.sectorDetailCode}>({from?.code})</Text>{' '}
        <Icon name="arrow-right" size={10} color={colors.textDark} />{' '}
        {leg.arr} {to?.city} <Text style={styles.sectorDetailCode}>({to?.code})</Text>
      </Text>
      <Text style={styles.sectorDetailMeta}>{leg.airline} {leg.flightCode} · {leg.dur} · {leg.stops}</Text>
      <Text style={styles.sectorDetailBaggage}><Icon name="briefcase" size={11} color={colors.textFaint} /> Cabin {leg.cabinBaggage || '—'} · Check-in {leg.checkinBaggage || '—'}</Text>
    </View>
  )
}

function money(n) {
  return `₹${(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function SectorFareBlock({ leg, serviceFee, collapsed, onToggle }) {
  const title = leg.label === 'ONWARD' ? 'Outbound Fare Summary' : leg.label === 'RETURN' ? 'Inbound Fare Summary' : `${leg.label} Fare Summary`
  return (
    <View style={styles.fareCard}>
      <Pressable style={styles.fareCardHeader} onPress={onToggle}>
        <View style={styles.fareCardHeaderLeft}>
          <View style={styles.fareToggleCircle}>
            <Icon name={collapsed ? 'plus' : 'minus'} size={11} color={colors.onDark} />
          </View>
          <Text style={styles.fareCardTitle}>{title}</Text>
        </View>
      </Pressable>

      {!collapsed && (
        <View style={styles.fareCardBody}>
          <Text style={styles.paxWiseLabel}>Pax-wise Fare</Text>
          {leg.typeBreakdown.map((t, i) => (
            <View key={t.type} style={[styles.paxFareBlock, i < leg.typeBreakdown.length - 1 && styles.paxFareBlockDivider]}>
              <View style={styles.paxFareRow}>
                <Text style={styles.paxFareLabelBold}>{t.type}</Text>
                <Text style={styles.paxFareValue}>{money(t.perPaxBase)}</Text>
              </View>
              <View style={styles.paxFareRow}>
                <Text style={styles.paxFareLabel}>Tax</Text>
                <Text style={styles.paxFareValue}>{money(t.perPaxTax)}</Text>
              </View>
              <View style={[styles.paxFareRow, styles.paxFareTotalRow]}>
                <Text style={styles.paxFareTotalLabel}>Total</Text>
                <Text style={styles.paxFareTotalValue}>{money(t.perPaxBase + t.perPaxTax)}</Text>
              </View>
            </View>
          ))}

          <View style={styles.fareSubRow}>
            <Text style={styles.fareSubLabel}>Service Fee</Text>
            <Text style={styles.fareSubValue}>{money(serviceFee)}</Text>
          </View>

          <View style={styles.fareAmountRow}>
            <Text style={styles.fareAmountLabel}>Sector Total</Text>
            <Text style={styles.fareAmountValue}>{money(leg.sectorTotal + serviceFee)}</Text>
          </View>
        </View>
      )}
    </View>
  )
}

function Field({ label, required, style, ...rest }) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.fieldLabel}>{label}{required && <Text style={styles.requiredMark}> *</Text>}</Text>
      <TextInput {...rest} style={styles.fieldInput} placeholderTextColor={colors.textMuted} />
    </View>
  )
}

function SelectField({ label, value, placeholder, onPress, required, style }) {
  return (
    <Pressable style={[styles.field, style]} onPress={onPress}>
      <Text style={styles.fieldLabel}>{label}{required && <Text style={styles.requiredMark}> *</Text>}</Text>
      <View style={styles.selectFieldRow}>
        <Text style={[styles.fieldInput, !value && { color: colors.textMuted }]}>{value || placeholder}</Text>
        <Icon name="chevron-down" size={12} color={colors.textFaint} />
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },

  summaryStrip: { margin: spacing.lg, marginBottom: 0, backgroundColor: colors.pinkBg, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryText: { fontSize: 11, color: colors.primaryDark, flex: 1 },
  summaryPrice: { fontSize: 12, fontWeight: '500', color: colors.primary },

  sectorBox: { marginHorizontal: spacing.lg, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12 },
  sectorDetailRow: { paddingVertical: 10 },
  sectorDetailDivider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  sectorDetailLabel: { fontSize: 10.5, fontWeight: '600', color: colors.primary, letterSpacing: 0.3 },
  sectorDetailTime: { fontSize: 13, fontWeight: '500', color: colors.textDark, marginTop: 4 },
  sectorDetailCode: { fontSize: 11, fontWeight: '400', color: colors.textMuted },
  sectorDetailMeta: { fontSize: 11, color: colors.textMuted, marginTop: 3 },
  sectorDetailBaggage: { fontSize: 11, color: colors.textFaint, marginTop: 3 },

  fareSheet: { backgroundColor: colors.white, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl },
  fareSheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: SITE.border, marginBottom: 4 },
  fareSheetTitle: { fontSize: 16, fontWeight: '700', color: SITE.dark },

  fareSubRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  fareSubLabel: { fontSize: 11.5, color: SITE.muted },
  fareSubValue: { fontSize: 11.5, color: SITE.muted },

  fareCard: { borderWidth: 1, borderColor: SITE.border, borderRadius: radius.md, marginBottom: spacing.md, overflow: 'hidden' },
  fareCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#eef2fb', paddingHorizontal: 12, paddingVertical: 10 },
  fareCardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fareToggleCircle: { width: 18, height: 18, borderRadius: 9, backgroundColor: SITE.orange, alignItems: 'center', justifyContent: 'center' },
  fareCardTitle: { fontSize: 13.5, fontWeight: '700', color: SITE.dark },
  fareCardBody: { paddingHorizontal: 12, paddingVertical: 10 },

  paxWiseLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 6 },
  paxFareBlock: { paddingVertical: 8 },
  paxFareBlockDivider: { borderBottomWidth: 1, borderBottomColor: SITE.border, borderStyle: 'dashed' },
  paxFareRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 },
  paxFareLabel: { fontSize: 11.5, color: SITE.muted },
  paxFareLabelBold: { fontSize: 12.5, fontWeight: '700', color: SITE.dark },
  paxFareValue: { fontSize: 11.5, color: SITE.muted },
  paxFareTotalRow: { borderTopWidth: 1, borderTopColor: SITE.border, marginTop: 6, paddingTop: 5 },
  paxFareTotalLabel: { fontSize: 12.5, fontWeight: '700', color: SITE.dark },
  paxFareTotalValue: { fontSize: 12.5, fontWeight: '700', color: SITE.dark },

  fareAmountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: SITE.border, marginTop: 8, paddingTop: 10 },
  fareAmountLabel: { fontSize: 13.5, fontWeight: '700', color: SITE.dark },
  fareAmountValue: { fontSize: 15, fontWeight: '800', color: SITE.orange },

  fareTotalBand: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fdeee0', borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, marginVertical: 10 },
  fareTotalLabel: { fontSize: 11, fontWeight: '700', color: SITE.orange, letterSpacing: 0.4, textTransform: 'uppercase' },
  fareTotalValue: { fontSize: 19, fontWeight: '800', color: SITE.orange },

  sectionLabel: { fontSize: 12, fontWeight: '500', color: colors.textMuted, marginBottom: 6 },
  chipsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: spacing.md },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 11, color: colors.textBody },

  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 12, marginBottom: spacing.md },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 12, fontWeight: '500', color: colors.textDark },

  collapsedRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: 12, paddingVertical: 11, marginBottom: spacing.md },
  collapsedSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  cardTitleMuted: { fontSize: 11, color: colors.textFaint, fontWeight: '400' },
  matchWarning: { fontSize: 11, color: colors.label },

  titleRow: { flexDirection: 'row', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  titlePill: { paddingHorizontal: 14, paddingVertical: 4, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  titlePillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  titlePillText: { fontSize: 11 },

  field: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8 },
  fieldLabel: { fontSize: 11, fontWeight: '500', color: colors.label },
  requiredMark: { color: colors.errorColor },
  fieldInput: { fontFamily: fonts.body, fontSize: 13, color: colors.textDark, padding: 0, marginTop: 1 },
  selectFieldRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  twoCol: { flexDirection: 'row', gap: 8 },


  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 10 },
  checkbox: { width: 17, height: 17, borderRadius: 4, borderWidth: 1.3, borderColor: colors.borderLight, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxLabel: { fontSize: 12.5, color: colors.textBody },

  gstBox: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.divider, gap: 2 },
  gstSaveRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.divider, borderStyle: 'dashed' },
  gstSaveHint: { fontSize: 10.5, color: colors.textFaint, flex: 1, marginRight: 8 },
  gstSaveBtn: { borderWidth: 1.3, borderColor: colors.primary, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 7 },
  gstSaveBtnText: { fontSize: 11.5, fontWeight: '600', color: colors.primary },
  gstSavedBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.success.bg, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 7 },
  gstSavedText: { fontSize: 11.5, fontWeight: '600', color: colors.successColor },

  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerFareBox: {},
  footerCount: { fontSize: 11, color: colors.textMuted },
  footerFareRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  footerPrice: { fontSize: 16, fontWeight: '500', color: colors.textDark },
  continueBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: radius.pill },
  continueBtnText: { fontSize: 13, fontWeight: '500', color: colors.onDark },

  modalRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(46,40,51,0.45)' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider, marginBottom: 4 },
  sheetTitle: { fontSize: 14, fontWeight: '500', color: colors.textDark },
  stateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.divider },
  stateRowText: { fontSize: 13, color: colors.textDark },
  fareDoneBtn: { backgroundColor: SITE.orange, borderRadius: radius.pill, paddingVertical: 14, alignItems: 'center', marginTop: spacing.lg },
  fareDoneBtnText: { fontSize: 15, fontWeight: '700', color: colors.onDark },
})
