import { useEffect, useState } from 'react'
import { View, Text, Pressable, StyleSheet, ScrollView, Platform, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from '../../src/components/Icon'
import WizardHeader from '../../src/components/WizardHeader'
import Preloader from '../../src/components/Preloader'
import { getDraft } from '../../src/services/flightBookingFlow'
import { getWalletBalance, getConvenienceFee } from '../../src/services/walletService'
import { getFlightPrice, createFlightBooking, createFlightRazorpayOrder, verifyFlightRazorpayPayment } from '../../src/services/bookingApi'
import { getRazorpayConfig } from '../../src/services/paymentConfigService'
import { TRIP_TYPE_CODE } from '../../src/services/flightsService'
import { colors, spacing, radius, fonts } from '../../src/theme/tokens'
import { useAppConfig, useRefreshConfig } from '../../src/context/ConfigContext'

const METHODS = [
  { id: 'creditpool', label: 'Credit Pool', icon: 'wallet', iconBg: colors.pinkBg, iconColor: colors.primary },
  { id: 'upi', label: 'UPI', sub: 'GPay, PhonePe, BHIM', icon: 'qrcode', iconBg: colors.orangeBg, iconColor: colors.label, modeId: '1' },
  { id: 'credit', label: 'Credit card', sub: 'Visa, Mastercard, RuPay, Amex', icon: 'credit-card', iconBg: colors.orangeBg, iconColor: colors.label, modeId: '3' },
  { id: 'debit', label: 'Debit card', sub: 'Visa, Mastercard, RuPay, Amex', icon: 'credit-card', iconBg: colors.orangeBg, iconColor: colors.label, modeId: '4' },
  { id: 'netbanking', label: 'Net banking', sub: 'All major banks', icon: 'building-bank', iconBg: colors.orangeBg, iconColor: colors.label, modeId: '2' },
]

const CHECKOUT_BLOCK = {
  upi: { name: 'UPI', instruments: [{ method: 'upi' }] },
  netbanking: { name: 'Net Banking', instruments: [{ method: 'netbanking' }] },
  credit: { name: 'Credit Card', instruments: [{ method: 'card', types: ['credit'] }] },
  debit: { name: 'Debit Card', instruments: [{ method: 'card', types: ['debit'] }] },
}

function loadRazorpayScript() {
  return new Promise(resolve => {
    if (window.Razorpay) { resolve(true); return }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function Payment() {
  const router = useRouter()
  const config = useAppConfig()
  const refreshConfig = useRefreshConfig()
  const { id } = useLocalSearchParams()
  const [draft, setDraft] = useState(null)
  const [wallet, setWallet] = useState(null)
  const [method, setMethod] = useState('creditpool')
  const [convenienceFee, setConvenienceFee] = useState(0)
  const [seconds, setSeconds] = useState(9 * 60 + 41)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')
  const [scriptReady, setScriptReady] = useState(false)
  // 'checking' | 'ready' | 'missing' | 'failed' — the mandatory live pricing re-check; the
  // booking payload's flightsData comes from here and the server rejects a booking without it.
  const [livePriceStatus, setLivePriceStatus] = useState('checking')
  const [flightsData, setFlightsData] = useState(null)
  const [priceRetryTick, setPriceRetryTick] = useState(0)
  const [rzConfig, setRzConfig] = useState({ enabled: true, currency: 'INR', themeColor: null })

  useEffect(() => {
    getDraft(id).then(setDraft)
    getWalletBalance().then(setWallet).catch(() => {})
    getRazorpayConfig().then(setRzConfig).catch(() => {})
    refreshConfig().catch(() => {})
    if (Platform.OS === 'web') loadRazorpayScript().then(setScriptReady)
  }, [id])

  useEffect(() => {
    const t = setInterval(() => setSeconds(s => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!draft) return
    const legs = draft.legs
    const missing = legs.some(l => !l.scid || !l.supplierCode || !l.yatraId || !l.price)
    if (missing) { setLivePriceStatus('missing'); return }
    setLivePriceStatus('checking')
    getFlightPrice({
      searchId: legs[0].scid,
      supplierCode: legs.map(l => l.supplierCode).join(','),
      flightId: legs.map(l => l.yatraId).join(','),
      price: legs.reduce((s, l) => s + l.price, 0),
      originCountry: legs.map(l => l.fromCountry).join(','),
      destinationCountry: legs.map(l => l.toCountry).join(','),
    }).then(res => {
      setFlightsData(res.data)
      setLivePriceStatus('ready')
    }).catch(() => setLivePriceStatus('failed'))
  }, [draft, priceRetryTick])

  const grandTotalAmt = draft?.fare?.grandTotalAmt ?? 0
  const sector = draft ? (TRIP_TYPE_CODE[draft.tripType] || 'O') : 'O'
  const activeMethod = METHODS.find(m => m.id === method)

  useEffect(() => {
    if (!draft || method === 'creditpool' || !grandTotalAmt) { setConvenienceFee(0); return }
    let cancelled = false
    getConvenienceFee(activeMethod.modeId, sector, grandTotalAmt)
      .then(fee => { if (!cancelled) setConvenienceFee(fee) })
      .catch(() => { if (!cancelled) setConvenienceFee(0) })
    return () => { cancelled = true }
  }, [draft, method, grandTotalAmt])

  const finalTotalAmt = grandTotalAmt + convenienceFee
  const creditPoolInsufficient = wallet !== null && wallet.creditPool < finalTotalAmt

  useEffect(() => {
    if (creditPoolInsufficient && method === 'creditpool') setMethod('upi')
  }, [creditPoolInsufficient, method])

  function buildBookingPayload() {
    return {
      countryCode: draft.contact.countryCode,
      mobile: draft.contact.mobile,
      email: draft.contact.email,
      adt: draft.adults, chd: draft.children, inf: draft.infants,
      travelClass: draft.cabinClass || 'Economy',
      tripLabel: TRIP_TYPE_CODE[draft.tripType] || 'O',
      sectors: draft.legs.map(l => ({
        originCity: l.fromFull, destinationCity: l.toFull,
        originCode: l.from, destinationCode: l.to,
        originCountry: l.fromCountry, destinationCountry: l.toCountry,
        flightDepartDateRaw: l.date,
        flightNo: l.flightCode, flightId: l.yatraId, fareType: l.fareId,
      })),
      passengers: draft.passengers,
      totalFlightAmt: draft.fare.totalFlightAmt,
      serviceFee: draft.fare.serviceFee,
      convenienceFee,
      totalPayableAmt: finalTotalAmt,
      flightsData,
      gst: draft.gst || undefined,
    }
  }

  async function payCreditPool() {
    setError(''); setPaying(true)
    try {
      const res = await createFlightBooking(buildBookingPayload())
      router.replace(`/confirmation/${res.ref}`)
    } catch (e) {
      setError(e.message || 'Payment failed.')
      setPaying(false)
    }
  }

  async function payRazorpay() {
    setError(''); setPaying(true)
    try {
      const order = await createFlightRazorpayOrder(finalTotalAmt)
      if (Platform.OS === 'web' && window.Razorpay) {
        const leadName = draft.passengers[0] ? `${draft.passengers[0].firstName} ${draft.passengers[0].lastName}` : ''
        const rzp = new window.Razorpay({
          key: order.keyId,
          amount: Math.round(order.amount * 100),
          currency: 'INR',
          name: config.appName || 'Shree Kalyanam',
          image: config.branding.logoUrl || undefined,
          description: 'Flight Booking Payment',
          order_id: order.orderId,
          prefill: { name: leadName, email: draft.contact.email, contact: draft.contact.mobile },
          theme: { color: rzConfig.themeColor || colors.primary },
          config: {
            display: {
              blocks: { highlighted: CHECKOUT_BLOCK[method] },
              sequence: ['block.highlighted'],
              preferences: { show_default_blocks: false },
            },
          },
          handler: async response => {
            setPaying(true)
            try {
              const verify = await verifyFlightRazorpayPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                mode: method,
                booking: buildBookingPayload(),
              })
              router.replace(`/confirmation/${verify.ref}`)
            } catch (e) {
              setError(e.message || 'Payment succeeded but booking creation failed. Please contact support.')
              setPaying(false)
            }
          },
          modal: { ondismiss: () => setPaying(false) },
        })
        rzp.open()
        setPaying(false)
      } else {
        Alert.alert('Not available', 'Online payment isn’t available in this app build yet. Please use Credit Pool or the web app.')
        setPaying(false)
      }
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.')
      setPaying(false)
    }
  }

  function pay() {
    if (paying || livePriceStatus !== 'ready') return
    if (method === 'creditpool') payCreditPool()
    else payRazorpay()
  }

  if (!draft) {
    return <Preloader />
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')
  const canPay = livePriceStatus === 'ready' && !paying && (method === 'creditpool' || Platform.OS !== 'web' || scriptReady) && !(method === 'creditpool' && creditPoolInsufficient)

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <WizardHeader
        title="Payment"
        subtitle="Step 5 of 6"
        step={5}
        right={
          <View style={styles.timerPill}>
            <Icon name="clock" size={10} color={colors.onDarkMuted2} />
            <Text style={styles.timerText}>{mm}:{ss}</Text>
          </View>
        }
      />

      <View style={styles.summaryStrip}>
        <View>
          <Text style={styles.summaryRoute}>{draft.legs[0].from} <Icon name="arrow-right" size={10} color={colors.textMuted} /> {draft.legs[draft.legs.length - 1].to} · {draft.adults + draft.children + draft.infants} traveller{draft.adults + draft.children + draft.infants > 1 ? 's' : ''}</Text>
          <Text style={styles.summaryPrice}>₹{finalTotalAmt.toLocaleString('en-IN')}</Text>
        </View>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.breakupLink}>View breakup</Text>
        </Pressable>
      </View>

      {livePriceStatus !== 'ready' && (
        <View style={styles.priceBanner}>
          <Text style={styles.priceBannerText}>
            {livePriceStatus === 'checking' && 'Confirming latest fare…'}
            {livePriceStatus === 'missing' && 'Flight pricing data is missing — please go back and search again.'}
            {livePriceStatus === 'failed' && 'Could not confirm the latest fare.'}
          </Text>
          {livePriceStatus === 'failed' && (
            <Pressable onPress={() => setPriceRetryTick(t => t + 1)}>
              <Text style={styles.priceBannerRetry}>Retry</Text>
            </Pressable>
          )}
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}>
        <Text style={styles.sectionLabel}>Pay with</Text>

        {METHODS.map(m => {
          const selected = method === m.id
          const disabled = (m.id === 'creditpool' && creditPoolInsufficient) || (m.id !== 'creditpool' && rzConfig.enabled === false)
          return (
            <Pressable key={m.id} style={[styles.methodCard, selected && styles.methodCardSelected, disabled && { opacity: 0.5 }]} onPress={() => !disabled && setMethod(m.id)} disabled={disabled}>
              <View style={styles.methodRow}>
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  {selected && <Icon name="check" size={10} color={colors.onDark} />}
                </View>
                <View style={[styles.methodIconBox, { backgroundColor: m.iconBg }]}>
                  <Icon name={m.icon} size={15} color={m.iconColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.methodLabel}>{m.label}</Text>
                  {m.id === 'creditpool' ? (
                    <Text style={[styles.methodSub, { color: disabled ? colors.errorColor : colors.successColor }]}>
                      {wallet ? `Balance ₹${wallet.creditPool.toLocaleString('en-IN')} · ${disabled ? 'insufficient' : 'sufficient'}` : '…'}
                    </Text>
                  ) : (
                    <Text style={styles.methodSub}>{m.sub}</Text>
                  )}
                </View>
                {m.id !== 'creditpool' && selected && convenienceFee > 0 && (
                  <Text style={[styles.methodFee, { color: colors.label }]}>+ ₹{convenienceFee.toLocaleString('en-IN')}</Text>
                )}
              </View>
              {m.id === 'creditpool' && selected && !disabled && wallet && (
                <Text style={styles.walletNote}>Instant ticketing · balance after payment ₹{(wallet.creditPool - finalTotalAmt).toLocaleString('en-IN')}</Text>
              )}
            </Pressable>
          )
        })}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerRow}>
          <View>
            <Text style={styles.footerLabel}>Paying via {activeMethod?.label.toLowerCase()}</Text>
            <Text style={styles.footerPrice}>₹{finalTotalAmt.toLocaleString('en-IN')}</Text>
          </View>
          <Pressable style={[styles.payBtn, !canPay && { opacity: 0.5 }]} onPress={pay} disabled={!canPay}>
            <Text style={styles.payBtnText}>{paying ? 'Processing…' : 'Pay securely'}</Text>
            <Icon name="lock" size={12} color={colors.onDark} />
          </Pressable>
        </View>
        <Text style={styles.footerNote}>256-bit encrypted · fare held for the timer above</Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },

  timerPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primaryDarker, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  timerText: { fontSize: 11, color: colors.onDarkMuted2 },

  summaryStrip: { margin: spacing.lg, marginBottom: 0, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryRoute: { fontSize: 11, color: colors.textMuted },
  summaryPrice: { fontSize: 15, fontWeight: '500', color: colors.textDark, marginTop: 2 },
  breakupLink: { fontSize: 11, fontWeight: '500', color: colors.primary },

  priceBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.orangeBg, marginHorizontal: spacing.lg, marginTop: spacing.sm, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 9 },
  priceBannerText: { flex: 1, fontSize: 11.5, color: colors.orangeText },
  priceBannerRetry: { fontSize: 12, fontWeight: '700', color: colors.primary, marginLeft: 8 },

  sectionLabel: { fontSize: 12, fontWeight: '500', color: colors.textMuted, marginBottom: 8 },

  methodCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 11, marginBottom: 8 },
  methodCardSelected: { backgroundColor: colors.selectedBg, borderWidth: 1.5, borderColor: colors.primary },
  methodRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  radio: { width: 17, height: 17, borderRadius: 9, borderWidth: 1.5, borderColor: colors.borderLight },
  radioSelected: { backgroundColor: colors.primary, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  methodIconBox: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  methodLabel: { fontSize: 13, fontWeight: '500', color: colors.textDark },
  methodSub: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  methodFee: { fontSize: 11, fontWeight: '500' },
  walletNote: { fontSize: 11, color: colors.textMuted, marginTop: 6, paddingLeft: 27 },

  errorText: { fontSize: 12, color: colors.errorColor, marginTop: 4, textAlign: 'center' },

  footer: { backgroundColor: colors.primaryDark, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerLabel: { fontSize: 11, color: colors.onDarkMuted },
  footerPrice: { fontSize: 17, fontWeight: '500', color: colors.onDark },
  payBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.accent, paddingHorizontal: 22, paddingVertical: 10, borderRadius: radius.pill },
  payBtnText: { fontSize: 14, fontWeight: '500', color: colors.accentText },
  footerNote: { marginTop: 8, textAlign: 'center', fontSize: 11, color: '#C9798F' },
})
