import { useEffect, useState } from 'react'
import { View, Text, Pressable, StyleSheet, ScrollView, Platform, Alert } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from '../../src/components/Icon'
import { colors, spacing, radius, fonts } from '../../src/theme/tokens'
import { getWalletBalance } from '../../src/services/walletService'
import { purchaseInsurance, createInsuranceRazorpayOrder, verifyInsuranceRazorpayPayment } from '../../src/services/insuranceApi'

const METHODS = [
  { id: 'creditpool', label: 'Credit Pool', icon: 'wallet', iconBg: colors.pinkBg, iconColor: colors.primary },
  { id: 'upi', label: 'UPI', sub: 'GPay, PhonePe, BHIM', icon: 'qrcode', iconBg: colors.orangeBg, iconColor: colors.label },
  { id: 'credit', label: 'Credit card', sub: 'Visa, Mastercard, RuPay, Amex', icon: 'credit-card', iconBg: colors.orangeBg, iconColor: colors.label },
  { id: 'debit', label: 'Debit card', sub: 'Visa, Mastercard, RuPay, Amex', icon: 'credit-card', iconBg: colors.orangeBg, iconColor: colors.label },
  { id: 'netbanking', label: 'Net banking', sub: 'All major banks', icon: 'building-bank', iconBg: colors.orangeBg, iconColor: colors.label },
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

function safeParse(json, fallback) {
  try { return JSON.parse(json) } catch { return fallback }
}

export default function InsurancePayment() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const { name, provider, coverage, premium, persons, dest, start, end, type } = params
  const premiumNum = Number(premium) || 0
  const personCount = Math.max(1, Number(persons) || 1)
  const proposer = safeParse(params.proposer, null)
  const travellers = safeParse(params.travellers, [])

  const [method, setMethod] = useState('creditpool')
  const [wallet, setWallet] = useState(null)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')
  const [scriptReady, setScriptReady] = useState(false)

  useEffect(() => {
    getWalletBalance().then(setWallet).catch(() => {})
    if (Platform.OS === 'web') loadRazorpayScript().then(setScriptReady)
  }, [])

  const creditPoolInsufficient = wallet !== null && wallet.creditPool < premiumNum
  useEffect(() => {
    if (creditPoolInsufficient && method === 'creditpool') setMethod('upi')
  }, [creditPoolInsufficient, method])

  const activeMethod = METHODS.find(m => m.id === method)
  const canPay = !paying && (method === 'creditpool' || Platform.OS !== 'web' || scriptReady) && !(method === 'creditpool' && creditPoolInsufficient)

  function buildPurchasePayload() {
    return {
      amount: premiumNum,
      planName: name,
      supplier: provider,
      coverage: Number(coverage) || 0,
      dest,
      dep: start,
      ret: end,
      adults: personCount,
      children: 0,
      proposer: proposer ? {
        nationality: proposer.country,
        mobile: proposer.mobile,
        email: proposer.email,
        address1: proposer.address1,
        address2: proposer.address2,
        state: proposer.state,
        district: proposer.district,
        city: proposer.city,
        pincode: proposer.pincode,
        gst: proposer.gst,
      } : undefined,
      travellers: travellers.filter(Boolean).map(t => ({
        title: t.salutation,
        firstName: t.firstName,
        lastName: t.lastName,
        dob: t.dob,
        passport: t.passport,
        relationship: t.relationship,
        nationality: t.nationality,
        nomineeFirst: t.nomineeFirst,
        nomineeLast: t.nomineeLast,
      })),
    }
  }

  function goToConfirmation(ref, policyNumber) {
    router.replace({
      pathname: '/insurance/confirmation',
      params: { ...params, ref, policyNumber: policyNumber || ref },
    })
  }

  async function payCreditPool() {
    setError(''); setPaying(true)
    try {
      const res = await purchaseInsurance(buildPurchasePayload())
      goToConfirmation(res.ref, res.policyNumber)
    } catch (e) {
      setError(e.message || 'Payment failed.')
      setPaying(false)
    }
  }

  async function payRazorpay() {
    setError(''); setPaying(true)
    try {
      const order = await createInsuranceRazorpayOrder(premiumNum)
      if (Platform.OS === 'web' && window.Razorpay) {
        const rzp = new window.Razorpay({
          key: order.keyId,
          amount: Math.round(order.amount * 100),
          currency: 'INR',
          name: 'Shree Kalyanam',
          description: 'Travel Insurance Premium',
          order_id: order.orderId,
          prefill: { email: proposer?.email, contact: proposer?.mobile },
          theme: { color: colors.primary },
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
              const verify = await verifyInsuranceRazorpayPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                mode: method,
                ...buildPurchasePayload(),
              })
              goToConfirmation(verify.ref, verify.policyNumber)
            } catch (e) {
              setError(e.message || 'Payment succeeded but policy issuance failed. Please contact support.')
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
    if (!canPay) return
    if (method === 'creditpool') payCreditPool()
    else payRazorpay()
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.hero}>
        <View style={styles.heroRow}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Icon name="chevron-left" size={20} color={colors.onDark} />
          </Pressable>
          <Text style={styles.heroTitle}>Payment</Text>
          <View style={{ width: 20 }} />
        </View>
      </View>

      <View style={styles.summaryStrip}>
        <View>
          <Text style={styles.summaryPlan}>{name}</Text>
          <Text style={styles.summaryPrice}>₹ {premiumNum.toLocaleString()}</Text>
        </View>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.breakupLink}>View policy</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}>
        <Text style={styles.sectionLabel}>Pay with</Text>

        {METHODS.map(m => {
          const selected = method === m.id
          const disabled = m.id === 'creditpool' && creditPoolInsufficient
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
              </View>
            </Pressable>
          )
        })}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerRow}>
          <View>
            <Text style={styles.footerLabel}>Paying from {activeMethod?.label.toLowerCase()}</Text>
            <Text style={styles.footerPrice}>₹ {premiumNum.toLocaleString()}</Text>
          </View>
          <Pressable style={[styles.payBtn, !canPay && { opacity: 0.5 }]} onPress={pay} disabled={!canPay}>
            <Text style={styles.payBtnText}>{paying ? 'Processing…' : 'Pay securely'}</Text>
            {!paying && <Icon name="lock" size={12} color={colors.onDark} />}
          </Pressable>
        </View>
        <Text style={styles.footerNote}>256-bit encrypted · policy issued instantly on payment</Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  hero: { backgroundColor: colors.primaryDark, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: 16 },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroTitle: { fontFamily: fonts.heading, fontSize: 18, fontWeight: '500', color: colors.onDark },

  summaryStrip: { margin: spacing.lg, marginBottom: 0, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryPlan: { fontSize: 12.5, color: colors.textMuted },
  summaryPrice: { fontSize: 16, fontWeight: '700', color: colors.textDark, marginTop: 2 },
  breakupLink: { fontSize: 12, fontWeight: '600', color: colors.primary },

  sectionLabel: { fontSize: 12.5, fontWeight: '600', color: colors.textMuted, marginBottom: 10 },

  methodCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 12, marginBottom: 10 },
  methodCardSelected: { backgroundColor: colors.selectedBg, borderWidth: 1.5, borderColor: colors.primary },
  methodRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: colors.borderLight },
  radioSelected: { backgroundColor: colors.primary, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  methodIconBox: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  methodLabel: { fontSize: 13.5, fontWeight: '600', color: colors.textDark },
  methodSub: { fontSize: 11.5, color: colors.textMuted, marginTop: 1 },

  errorText: { fontSize: 12, color: colors.errorColor, marginTop: 4, textAlign: 'center' },

  footer: { backgroundColor: colors.primaryDark, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, paddingBottom: spacing.lg },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerLabel: { fontSize: 11, color: colors.onDarkMuted },
  footerPrice: { fontSize: 18, fontWeight: '700', color: colors.onDark },
  payBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.accent, paddingHorizontal: 24, paddingVertical: 12, borderRadius: radius.pill },
  payBtnText: { fontSize: 14, fontWeight: '600', color: colors.accentText },
  footerNote: { marginTop: 8, textAlign: 'center', fontSize: 11, color: colors.onDarkMuted2 },
})
