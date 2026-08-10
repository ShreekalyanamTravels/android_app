import { useState } from 'react'
import { View, TextInput, Pressable, StyleSheet, ScrollView, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import ThemedText from '../src/components/ThemedText'
import Button from '../src/components/Button'
import Card from '../src/components/Card'
import Icon from '../src/components/Icon'
import { changePassword, logout } from '../src/services/authService'
import { colors, spacing, radius, fonts } from '../src/theme/tokens'

export default function ChangePassword() {
  const router = useRouter()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (submitting) return
    setError('')

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all fields.')
      return
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      await changePassword(currentPassword, newPassword)
      // Changing password revokes every session on the backend, including this one —
      // sign out locally now rather than let the next silent refresh fail later.
      await logout()
      Alert.alert('Password changed', 'Please sign in again with your new password.')
      router.replace('/(auth)/login')
    } catch (e) {
      setError(e.message || 'Could not change password')
      setSubmitting(false)
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
      <ThemedText variant="h2">Change Password</ThemedText>
      <ThemedText variant="muted" style={{ marginTop: 4 }}>Choose a new password for your account</ThemedText>

      <Card style={{ marginTop: spacing.lg }}>
        <ThemedText variant="label">Current Password</ThemedText>
        <View style={styles.inputRow}>
          <TextInput
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry={!showCurrent}
            placeholderTextColor={colors.textMuted}
            style={styles.inputFlex}
          />
          <Pressable onPress={() => setShowCurrent(v => !v)} hitSlop={8}>
            <Icon name="eye" size={16} color={colors.textFaint} />
          </Pressable>
        </View>

        <ThemedText variant="label" style={{ marginTop: spacing.md }}>New Password</ThemedText>
        <View style={styles.inputRow}>
          <TextInput
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showNew}
            placeholderTextColor={colors.textMuted}
            style={styles.inputFlex}
          />
          <Pressable onPress={() => setShowNew(v => !v)} hitSlop={8}>
            <Icon name="eye" size={16} color={colors.textFaint} />
          </Pressable>
        </View>

        <ThemedText variant="label" style={{ marginTop: spacing.md }}>Confirm New Password</ThemedText>
        <TextInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showNew}
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
      </Card>

      {error ? <ThemedText variant="muted" style={{ color: colors.errorColor, marginTop: spacing.sm }}>{error}</ThemedText> : null}

      <Button
        label={submitting ? 'Updating…' : 'Update Password'}
        onPress={handleSubmit}
        loading={submitting}
        style={{ marginTop: spacing.xl }}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  input: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textDark,
    backgroundColor: colors.cream,
  },
  inputRow: {
    marginTop: spacing.sm,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.cream,
  },
  inputFlex: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textDark,
    padding: 0,
  },
})
