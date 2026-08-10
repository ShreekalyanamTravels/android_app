import { useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from '../../src/components/Icon'
import Toast from '../../src/components/Toast'
import { forgotPassword } from '../../src/services/authService'
import { colors, spacing, radius, fonts } from '../../src/theme/tokens'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ForgotPassword() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [toast, setToast] = useState(null)

  function updateEmail(value) {
    setEmail(value)
    if (error) setError('')
  }

  async function handleSubmit() {
    if (loading) return

    const trimmed = email.trim()
    if (!trimmed) { setError('Email is required'); return }
    if (!EMAIL_RE.test(trimmed)) { setError('Enter a valid email address'); return }

    setLoading(true)
    try {
      await forgotPassword(trimmed)
      setSent(true)
    } catch (e) {
      setToast({ id: Date.now(), message: e.message || 'Unable to send reset link' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Icon name="chevron-left" size={20} color={colors.onDark} />
        </Pressable>
        <Text style={styles.headerTitle}>Forgot password</Text>
        <View style={{ width: 20 }} />
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          {sent ? (
            <View style={styles.sentState}>
              <View style={styles.sentIcon}>
                <Icon name="mail" size={26} color={colors.primary} />
              </View>
              <Text style={styles.sentTitle}>Check your email</Text>
              <Text style={styles.sentSubtitle}>
                If an account exists for {email.trim()}, we've sent a link to reset your password.
              </Text>
              <Pressable style={styles.signInBtn} onPress={() => router.replace('/(auth)/login')}>
                <Text style={styles.signInText}>Back to sign in</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.iconWrap}>
                <Icon name="lock" size={22} color={colors.primary} />
              </View>
              <Text style={styles.title}>Reset your password</Text>
              <Text style={styles.subtitle}>Enter your account email and we'll send you a link to reset your password.</Text>

              <View style={[styles.field, error && styles.fieldError]}>
                <Icon name="user" size={17} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>EMAIL ID</Text>
                  <TextInput
                    value={email}
                    onChangeText={updateEmail}
                    style={styles.fieldInput}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoFocus
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>
              {error ? <Text style={styles.fieldErrorText}>{error}</Text> : null}

              <Pressable style={[styles.signInBtn, loading && styles.signInBtnDisabled]} onPress={handleSubmit} disabled={loading}>
                {loading && <ActivityIndicator size="small" color={colors.onDark} />}
                <Text style={styles.signInText}>{loading ? 'Sending…' : 'Send reset link'}</Text>
                {!loading && <Icon name="arrow-right" size={13} color={colors.onDark} />}
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>

      {toast ? <Toast key={toast.id} message={toast.message} onHide={() => setToast(null)} /> : null}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.primaryDark, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  headerTitle: { fontSize: 15, fontWeight: '500', color: colors.onDark },

  content: { paddingHorizontal: 18, paddingTop: 28, paddingBottom: 26, alignItems: 'stretch' },
  iconWrap: {
    alignSelf: 'center', width: 52, height: 52, borderRadius: 26,
    backgroundColor: colors.pinkBg, alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  title: { textAlign: 'center', fontSize: 16, fontWeight: '500', color: colors.textDark },
  subtitle: { textAlign: 'center', marginTop: 6, marginBottom: 20, fontSize: 12, color: colors.textMuted, lineHeight: 18 },

  field: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: 12, paddingVertical: 9, marginBottom: 10,
  },
  fieldLabel: { fontSize: 11, fontWeight: '500', color: colors.label },
  fieldInput: { fontFamily: fonts.body, fontSize: 13, color: colors.textDark, padding: 0, marginTop: 1 },
  fieldError: { borderColor: colors.errorColor },
  fieldErrorText: { fontSize: 11, color: colors.errorColor, marginTop: -6, marginBottom: 10, marginLeft: 4 },

  signInBtn: { flexDirection: 'row', gap: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: radius.md, marginTop: 6 },
  signInBtnDisabled: { opacity: 0.6 },
  signInText: { fontSize: 14, fontWeight: '500', color: colors.onDark },

  sentState: { alignItems: 'center', paddingTop: 20 },
  sentIcon: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: colors.pinkBg,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  sentTitle: { fontSize: 16, fontWeight: '500', color: colors.textDark },
  sentSubtitle: { textAlign: 'center', marginTop: 8, marginBottom: 24, fontSize: 12, color: colors.textMuted, lineHeight: 18, paddingHorizontal: 8 },
})
