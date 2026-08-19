import { useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from '../../src/components/Icon'
import Toast from '../../src/components/Toast'
import BrandLogo from '../../src/components/BrandLogo'
import { login, sendLoginOtp, verifyLoginOtp } from '../../src/services/authService'
import { colors, spacing, radius, fonts } from '../../src/theme/tokens'
import { useAppConfig } from '../../src/context/ConfigContext'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MOBILE_RE = /^[6-9]\d{9}$/
const OTP_RE = /^\d{6}$/

function validate(email, password) {
  const errors = {}
  if (!email.trim()) errors.email = 'Email is required'
  else if (!EMAIL_RE.test(email.trim())) errors.email = 'Enter a valid email address'
  if (!password) errors.password = 'Password is required'
  return errors
}

export default function Login() {
  const router = useRouter()
  const config = useAppConfig()
  const [loginMethod, setLoginMethod] = useState('email') // 'email' | 'mobile'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null) // { id, message }

  const [mobile, setMobile] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [verifyingOtp, setVerifyingOtp] = useState(false)

  function showToast(message) {
    setToast({ id: Date.now(), message })
  }

  function switchMethod(method) {
    setLoginMethod(method)
    setFieldErrors({})
  }

  function changeNumber() {
    setOtpSent(false)
    setOtp('')
  }

  async function sendOtp() {
    if (sendingOtp) return
    if (!MOBILE_RE.test(mobile.trim())) {
      showToast('Enter a valid 10-digit mobile number')
      return
    }
    setSendingOtp(true)
    try {
      await sendLoginOtp(mobile.trim())
      setOtpSent(true)
    } catch (e) {
      showToast(e.message || 'Unable to send OTP')
    } finally {
      setSendingOtp(false)
    }
  }

  async function verifyOtp() {
    if (verifyingOtp) return
    if (!OTP_RE.test(otp.trim())) {
      showToast('Enter the 6-digit OTP')
      return
    }
    setVerifyingOtp(true)
    try {
      await verifyLoginOtp(mobile.trim(), otp.trim())
      router.replace('/(tabs)/home')
    } catch (e) {
      showToast(e.message || 'Unable to verify OTP')
    } finally {
      setVerifyingOtp(false)
    }
  }

  function updateEmail(value) {
    setEmail(value)
    if (fieldErrors.email) setFieldErrors(f => ({ ...f, email: undefined }))
  }

  function updatePassword(value) {
    setPassword(value)
    if (fieldErrors.password) setFieldErrors(f => ({ ...f, password: undefined }))
  }

  async function signIn() {
    if (loading) return

    const errors = validate(email, password)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      showToast(errors.email || errors.password)
      return
    }

    setLoading(true)
    try {
      await login(email.trim(), password)
      router.replace('/(tabs)/home')
    } catch (e) {
      showToast(e.message || 'Unable to sign in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <View style={styles.heroTopRow}>
            <View style={styles.langPill}>
              <Text style={styles.langPillText}>IN · English</Text>
              <Icon name="chevron-down" size={10} color={colors.onDark} />
            </View>
          </View>
          <View style={styles.heroArt}>
            <View style={styles.heroCircle} />
            <View style={styles.heroCard}>
              <Icon name="user-circle" size={16} color={colors.primary} />
              <View style={styles.heroLine} />
              <View style={styles.heroLine} />
              <View style={styles.heroLineShort} />
            </View>
            <View style={styles.heroBadge}>
              <Icon name="shield-check" size={18} color={colors.accentText} />
            </View>
            <View style={styles.heroLock}>
              <Icon name="lock" size={13} color={colors.onDarkMuted2} />
            </View>
          </View>
        </View>

        <View style={styles.content}>
          <BrandLogo uri={config.branding.logoUrl} style={styles.logo} />
          <Text style={styles.tagline}>Premium travel, curated for you</Text>
          <Text style={styles.title}>Corporate login</Text>
          <Text style={styles.subtitle}>Access your corporate travel dashboard</Text>

          {config.featureFlags.otpLogin && (
            <View style={styles.methodToggle}>
              <Pressable style={[styles.methodPill, loginMethod === 'email' && styles.methodPillActive]} onPress={() => switchMethod('email')}>
                <Text style={[styles.methodPillText, loginMethod === 'email' && styles.methodPillTextActive]}>Email</Text>
              </Pressable>
              <Pressable style={[styles.methodPill, loginMethod === 'mobile' && styles.methodPillActive]} onPress={() => switchMethod('mobile')}>
                <Text style={[styles.methodPillText, loginMethod === 'mobile' && styles.methodPillTextActive]}>Mobile</Text>
              </Pressable>
            </View>
          )}

          {loginMethod === 'email' || !config.featureFlags.otpLogin ? (
            <>
              <View style={[styles.field, fieldErrors.email && styles.fieldError]}>
                <Icon name="user" size={17} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>EMAIL ID</Text>
                  <TextInput
                    value={email}
                    onChangeText={updateEmail}
                    style={styles.fieldInput}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>
              {fieldErrors.email ? <Text style={styles.fieldErrorText}>{fieldErrors.email}</Text> : null}

              <View style={[styles.field, fieldErrors.password && styles.fieldError]}>
                <Icon name="lock" size={17} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>PASSWORD</Text>
                  <TextInput
                    value={password}
                    onChangeText={updatePassword}
                    secureTextEntry={!showPassword}
                    style={[styles.fieldInput, { letterSpacing: showPassword ? 0 : 2 }]}
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                <Pressable onPress={() => setShowPassword(v => !v)} hitSlop={8}>
                  <Icon name="eye" size={16} color={colors.textFaint} />
                </Pressable>
              </View>
              {fieldErrors.password ? <Text style={styles.fieldErrorText}>{fieldErrors.password}</Text> : null}

              <View style={styles.rowBetween}>
                <Pressable style={styles.rememberRow} onPress={() => setRemember(v => !v)}>
                  <View style={[styles.checkbox, remember && styles.checkboxChecked]}>
                    {remember && <Icon name="check" size={10} color={colors.onDark} />}
                  </View>
                  <Text style={styles.rememberText}>Remember me</Text>
                </Pressable>
                <Pressable onPress={() => router.push('/(auth)/forgot-password')} hitSlop={6}>
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </Pressable>
              </View>

              <Pressable style={[styles.signInBtn, loading && styles.signInBtnDisabled]} onPress={signIn} disabled={loading}>
                {loading && <ActivityIndicator size="small" color={colors.onDark} />}
                <Text style={styles.signInText}>{loading ? 'Signing in…' : 'Sign in'}</Text>
                {!loading && <Icon name="arrow-right" size={13} color={colors.onDark} />}
              </Pressable>
            </>
          ) : (
            <>
              <View style={styles.field}>
                <Icon name="user" size={17} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>MOBILE NUMBER</Text>
                  <TextInput
                    value={mobile}
                    onChangeText={setMobile}
                    style={styles.fieldInput}
                    keyboardType="phone-pad"
                    maxLength={10}
                    editable={!otpSent}
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                {otpSent && (
                  <Pressable onPress={changeNumber} hitSlop={6}>
                    <Text style={styles.changeNumberText}>Change Number</Text>
                  </Pressable>
                )}
              </View>

              {otpSent && (
                <View style={styles.field}>
                  <Icon name="lock" size={17} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>ENTER OTP</Text>
                    <TextInput
                      value={otp}
                      onChangeText={setOtp}
                      style={styles.fieldInput}
                      keyboardType="number-pad"
                      maxLength={6}
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>
              )}

              <Pressable
                style={[styles.signInBtn, (sendingOtp || verifyingOtp) && styles.signInBtnDisabled, { marginTop: 6 }]}
                onPress={otpSent ? verifyOtp : sendOtp}
                disabled={sendingOtp || verifyingOtp}
              >
                {(sendingOtp || verifyingOtp) && <ActivityIndicator size="small" color={colors.onDark} />}
                <Text style={styles.signInText}>
                  {otpSent ? (verifyingOtp ? 'Verifying…' : 'Verify & Sign In') : (sendingOtp ? 'Sending OTP…' : 'Send OTP')}
                </Text>
                {!sendingOtp && !verifyingOtp && <Icon name="arrow-right" size={13} color={colors.onDark} />}
              </Pressable>
            </>
          )}

          <Text style={styles.footerNote}>
            <Icon name="lock" size={11} color={colors.textFaint} />  Secured access for authorised corporate accounts
          </Text>
        </View>
      </ScrollView>

      {toast ? <Toast key={toast.id} message={toast.message} onHide={() => setToast(null)} /> : null}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  hero: { backgroundColor: colors.primaryDark, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xl },
  heroTopRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  langPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primaryDarker, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  langPillText: { fontSize: 11, color: colors.onDark },
  heroArt: { alignSelf: 'center', width: 150, height: 96, marginTop: 6 },
  heroCircle: { position: 'absolute', left: 30, top: 0, width: 90, height: 90, borderRadius: 45, backgroundColor: colors.primaryDarker },
  heroCard: { position: 'absolute', left: 55, top: 18, width: 40, height: 62, borderRadius: 10, backgroundColor: colors.onDark, alignItems: 'center', justifyContent: 'center', gap: 5 },
  heroLine: { width: 24, height: 4, borderRadius: 2, backgroundColor: colors.onDarkMuted2 },
  heroLineShort: { width: 16, height: 5, borderRadius: 3, backgroundColor: colors.accent },
  heroBadge: { position: 'absolute', right: 8, bottom: 4, width: 34, height: 34, borderRadius: 10, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  heroLock: { position: 'absolute', left: 12, bottom: 10, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primaryDarker, borderWidth: 2, borderColor: '#B04663', alignItems: 'center', justifyContent: 'center' },

  content: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 26, alignItems: 'stretch' },
  logo: { width: 230, height: 104, alignSelf: 'center' },
  tagline: { textAlign: 'center', marginTop: 2, fontFamily: fonts.heading, fontSize: 11, fontStyle: 'italic', color: colors.accent },
  title: { textAlign: 'center', marginTop: 16, fontSize: 16, fontWeight: '500', color: colors.textDark },
  subtitle: { textAlign: 'center', marginTop: 2, marginBottom: 16, fontSize: 12, color: colors.textMuted },

  methodToggle: { flexDirection: 'row', backgroundColor: colors.creamAlt, borderRadius: radius.pill, padding: 3, marginBottom: 16 },
  methodPill: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: radius.pill },
  methodPillActive: { backgroundColor: colors.primary },
  methodPillText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  methodPillTextActive: { color: colors.onDark },
  changeNumberText: { fontSize: 11, fontWeight: '600', color: colors.primary },

  field: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: 12, paddingVertical: 9, marginBottom: 10,
  },
  fieldLabel: { fontSize: 11, fontWeight: '500', color: colors.label },
  fieldInput: { fontFamily: fonts.body, fontSize: 13, color: colors.textDark, padding: 0, marginTop: 1 },
  fieldError: { borderColor: colors.errorColor },
  fieldErrorText: { fontSize: 11, color: colors.errorColor, marginTop: -6, marginBottom: 10, marginLeft: 4 },

  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, marginBottom: 14 },
  rememberRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  checkbox: { width: 14, height: 14, borderRadius: 4, borderWidth: 1, borderColor: colors.borderLight, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  rememberText: { fontSize: 12, color: colors.textBody },
  forgotText: { fontSize: 12, fontWeight: '500', color: colors.primary },

  signInBtn: { flexDirection: 'row', gap: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: radius.md },
  signInBtnDisabled: { opacity: 0.6 },
  signInText: { fontSize: 14, fontWeight: '500', color: colors.onDark },
  footerNote: { marginTop: 16, textAlign: 'center', fontSize: 11, color: colors.textFaint },
})
