import { useEffect, useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Platform, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import ThemedText from '../../src/components/ThemedText'
import Button from '../../src/components/Button'
import Card from '../../src/components/Card'
import { getCurrentUser } from '../../src/services/authService'
import {
  getConvenienceFee, getGstPercentage, createRechargeOrder, verifyRechargePayment,
} from '../../src/services/walletService'
import { getRazorpayConfig } from '../../src/services/paymentConfigService'
import { colors, spacing, radius, fonts } from '../../src/theme/tokens'
import { useAppConfig, useRefreshConfig } from '../../src/context/ConfigContext'

const ACCENT = colors.accent // matches the web recharge page's orange theme

const QUICK_AMOUNTS = [5000, 10000, 25000, 50000, 100000]

// Matches payment_modes.id — same mapping the web /corporate/online-payment page uses.
const METHODS = [
  { key: 'upi', label: 'UPI', modeId: '1', icon: '📱' },
  { key: 'netbanking', label: 'Net Banking', modeId: '2', icon: '🏦' },
  { key: 'credit', label: 'Credit Card', modeId: '3', icon: '💳' },
  { key: 'debit', label: 'Debit Card', modeId: '4', icon: '🏧' },
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

export default function RechargeWallet() {
  const router = useRouter()
  const config = useAppConfig()
  const refreshConfig = useRefreshConfig()
  const user = getCurrentUser()
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('upi')
  const [convenience, setConvenience] = useState(0)
  const [gstPercentage, setGstPercentage] = useState(0)
  const [payStatus, setPayStatus] = useState('idle') // idle | creating | success
  const [error, setError] = useState('')
  const [scriptReady, setScriptReady] = useState(false)
  // enabled defaults true (fail open) so a slow/failed config fetch never blocks a payment that
  // would otherwise work — same reasoning as the app-config feature flags.
  const [rzConfig, setRzConfig] = useState({ enabled: true, currency: 'INR', themeColor: null })

  const numAmount = parseFloat(amount) || 0
  const activeMethod = METHODS.find(m => m.key === method)
  const gst = numAmount > 0 ? Math.round((convenience * gstPercentage) / 100) : 0
  const total = numAmount + convenience + gst
  const amountValid = numAmount >= 100
  const canPay = amountValid && rzConfig.enabled && (Platform.OS !== 'web' || scriptReady) && payStatus !== 'creating'

  useEffect(() => {
    getGstPercentage().then(setGstPercentage).catch(() => setGstPercentage(0))
    getRazorpayConfig().then(setRzConfig).catch(() => {})
    refreshConfig().catch(() => {})
    if (Platform.OS === 'web') loadRazorpayScript().then(setScriptReady)
  }, [])

  useEffect(() => {
    if (!numAmount) { setConvenience(0); return }
    let cancelled = false
    getConvenienceFee(activeMethod.modeId, 'O', numAmount)
      .then(fee => { if (!cancelled) setConvenience(fee) })
      .catch(() => { if (!cancelled) setConvenience(0) })
    return () => { cancelled = true }
  }, [method, numAmount])

  async function handlePay() {
    setError('')
    setPayStatus('creating')
    try {
      const order = await createRechargeOrder(numAmount, activeMethod.modeId)

      if (Platform.OS === 'web' && window.Razorpay) {
        const rzp = new window.Razorpay({
          key: order.keyId,
          amount: Math.round(order.total * 100),
          currency: 'INR',
          name: config.appName || 'Shree Kalyanam',
          image: config.branding.logoUrl || undefined,
          description: 'Wallet Top-up',
          order_id: order.orderId,
          prefill: { name: user?.name, email: user?.email },
          theme: { color: rzConfig.themeColor || ACCENT },
          config: {
            display: {
              blocks: { highlighted: CHECKOUT_BLOCK[method] },
              sequence: ['block.highlighted'],
              preferences: { show_default_blocks: false },
            },
          },
          handler: async response => {
            setPayStatus('creating')
            try {
              await verifyRechargePayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              })
              setPayStatus('success')
            } catch (e) {
              setError(e.message || 'Payment succeeded but verification failed. Please contact support.')
              setPayStatus('idle')
            }
          },
          modal: { ondismiss: () => setPayStatus('idle') },
        })
        rzp.open()
        setPayStatus('idle')
      } else {
        Alert.alert('Not available', 'Online payment isn’t available in this app build yet. Please use the web app to recharge.')
        setPayStatus('idle')
      }
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.')
      setPayStatus('idle')
    }
  }

  if (config.featureFlags.walletRecharge === false || rzConfig.enabled === false) {
    return (
      <View style={[styles.container, { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }]}>
        <ThemedText variant="h3" style={{ textAlign: 'center' }}>Wallet Recharge Unavailable</ThemedText>
        <ThemedText variant="muted" style={{ textAlign: 'center', marginTop: spacing.sm }}>
          Online wallet recharge is temporarily disabled. Please try again later.
        </ThemedText>
        <Button label="Back to Profile" onPress={() => router.back()} style={{ marginTop: spacing.lg }} />
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
      <ThemedText variant="h2">Recharge Wallet</ThemedText>
      <ThemedText variant="muted" style={{ marginTop: 4 }}>Add funds to your wallet securely</ThemedText>

      <Card style={{ marginTop: spacing.lg }}>
        <ThemedText variant="label">Enter Amount</ThemedText>
        <View style={styles.amountRow}>
          <Text style={styles.rupee}>₹</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            style={styles.amountInput}
          />
        </View>
        <View style={styles.chipRow}>
          {QUICK_AMOUNTS.map(a => (
            <Pressable
              key={a}
              onPress={() => setAmount(String(a))}
              style={[styles.chip, amount === String(a) && styles.chipActive]}
            >
              <Text style={[styles.chipText, amount === String(a) && styles.chipTextActive]}>
                ₹{a >= 100000 ? '1L' : `${a / 1000}K`}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card style={{ marginTop: spacing.lg }}>
        <ThemedText variant="label">Payment Method</ThemedText>
        <View style={styles.methodGrid}>
          {METHODS.map(m => (
            <Pressable
              key={m.key}
              onPress={() => setMethod(m.key)}
              style={[styles.methodTile, method === m.key && styles.methodTileActive]}
            >
              <Text style={{ fontSize: 20 }}>{m.icon}</Text>
              <Text style={[styles.methodLabel, method === m.key && styles.methodLabelActive]}>{m.label}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card style={{ marginTop: spacing.lg }}>
        <ThemedText variant="label">Payment Summary</ThemedText>
        <SummaryRow label="Amount" value={numAmount > 0 ? `₹${numAmount.toLocaleString('en-IN')}` : '—'} />
        <SummaryRow label="Convenience Fee" value={convenience > 0 ? `₹${convenience.toLocaleString('en-IN')}` : '—'} />
        <SummaryRow
          label={`GST on Fee${gstPercentage ? ` (${gstPercentage}%)` : ''}`}
          value={gst > 0 ? `₹${gst.toLocaleString('en-IN')}` : '—'}
          last
        />
        <View style={styles.totalRow}>
          <ThemedText variant="bodyMedium">Total Payable</ThemedText>
          <ThemedText variant="h3" style={{ color: ACCENT }}>{total > 0 ? `₹${total.toLocaleString('en-IN')}` : '—'}</ThemedText>
        </View>
      </Card>

      {error ? <ThemedText variant="muted" style={{ color: colors.errorColor, marginTop: spacing.md }}>{error}</ThemedText> : null}

      {payStatus === 'success' ? (
        <Card style={{ marginTop: spacing.lg, backgroundColor: '#E8F5E9', borderColor: '#BFE3C3' }}>
          <ThemedText variant="bodyMedium" style={{ color: colors.successColor, textAlign: 'center' }}>✓ Payment Successful</ThemedText>
          <ThemedText variant="muted" style={{ textAlign: 'center', marginTop: 4 }}>
            ₹{numAmount.toLocaleString('en-IN')} has been added to your wallet.
          </ThemedText>
          <Button label="Back to Profile" onPress={() => router.back()} style={{ marginTop: spacing.md }} />
        </Card>
      ) : (
        <>
          <Button
            label={payStatus === 'creating' ? 'Processing…' : 'Proceed to Payment Gateway →'}
            onPress={handlePay}
            disabled={!canPay}
            style={{ marginTop: spacing.xl, backgroundColor: canPay ? ACCENT : undefined }}
          />
          {amountValid && (
            <ThemedText variant="muted" style={{ textAlign: 'center', marginTop: spacing.sm }}>
              You will be redirected to a secure payment gateway to complete the transaction.
            </ThemedText>
          )}
        </>
      )}
    </ScrollView>
  )
}

function SummaryRow({ label, value, last = false }) {
  return (
    <View style={[styles.summaryRow, !last && styles.summaryDivider]}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },

  amountRow: {
    marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center',
    borderWidth: 2, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.md, backgroundColor: colors.cream,
  },
  rupee: { fontSize: 18, fontWeight: '800', color: colors.textDark, marginRight: 6 },
  amountInput: { flex: 1, fontFamily: fonts.body, fontSize: 20, fontWeight: '800', color: colors.textDark, paddingVertical: spacing.md },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.md },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white },
  chipActive: { borderColor: ACCENT, backgroundColor: colors.orangeBg },
  chipText: { fontSize: 12.5, fontWeight: '700', color: colors.textMuted },
  chipTextActive: { color: ACCENT },

  methodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: spacing.md },
  methodTile: {
    width: '47%', flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 2, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md, backgroundColor: colors.white,
  },
  methodTileActive: { borderColor: ACCENT, backgroundColor: colors.orangeBg },
  methodLabel: { fontSize: 13, fontWeight: '700', color: colors.textBody },
  methodLabelActive: { color: ACCENT },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9 },
  summaryDivider: { borderBottomWidth: 1, borderBottomColor: colors.creamAlt },
  summaryLabel: { fontSize: 13, color: colors.textMuted },
  summaryValue: { fontSize: 13, fontWeight: '600', color: colors.textDark },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: spacing.md, marginTop: 4 },
})
