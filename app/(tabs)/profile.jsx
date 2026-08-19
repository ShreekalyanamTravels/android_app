import { useCallback, useEffect, useState } from 'react'
import { View, ScrollView, StyleSheet, RefreshControl, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import ThemedText from '../../src/components/ThemedText'
import Badge from '../../src/components/Badge'
import Button from '../../src/components/Button'
import Card from '../../src/components/Card'
import Preloader from '../../src/components/Preloader'
import Icon from '../../src/components/Icon'
import AppDrawer from '../../src/components/AppDrawer'
import ConfirmModal from '../../src/components/ConfirmModal'
import { getCurrentUser } from '../../src/services/profileService'
import { logout } from '../../src/services/authService'
import { getWalletBalance } from '../../src/services/walletService'
import { usePullToRefresh } from '../../src/hooks/usePullToRefresh'
import { colors, spacing, radius } from '../../src/theme/tokens'

const fmt = n => `₹ ${Math.abs(n).toLocaleString('en-IN')}`

const COMPANY_FIELDS = [
  ['companyName', 'Company'],
  ['gstNumber', 'GST Number'],
  ['panNumber', 'PAN Number'],
  ['address', 'Address'],
  ['state', 'State'],
  ['pincode', 'Pincode'],
]

export default function Profile() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')
  const [wallet, setWallet] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [confirmLogoutVisible, setConfirmLogoutVisible] = useState(false)

  const loadData = useCallback(async () => {
    await Promise.all([
      getCurrentUser().then(setProfile).catch(e => setError(e.message || 'Failed to load profile')),
      getWalletBalance().then(setWallet).catch(() => {}),
    ])
  }, [])
  const { refreshing, onRefresh } = usePullToRefresh(loadData)

  useEffect(() => { loadData() }, [loadData])

  function handleLogout() {
    setConfirmLogoutVisible(true)
  }

  async function doLogout() {
    setConfirmLogoutVisible(false)
    await logout()
    router.replace('/(auth)/login')
  }

  const logoutConfirm = (
    <ConfirmModal
      visible={confirmLogoutVisible}
      title="Log Out"
      message="Are you sure you want to log out?"
      confirmLabel="Log Out"
      destructive
      onConfirm={doLogout}
      onCancel={() => setConfirmLogoutVisible(false)}
    />
  )

  if (error) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.centered}>
          <ThemedText variant="muted">{error}</ThemedText>
          <Button label="Log Out" variant="ghost" onPress={handleLogout} style={{ marginTop: spacing.lg }} />
        </View>
        {logoutConfirm}
      </SafeAreaView>
    )
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Preloader />
      </SafeAreaView>
    )
  }

  const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ')
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  const companyRows = COMPANY_FIELDS.filter(([key]) => profile[key])
  const memberSince = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        <Pressable onPress={() => setDrawerOpen(true)} hitSlop={8} style={styles.menuBtn}>
          <Icon name="menu" size={22} color={colors.textDark} />
        </Pressable>

        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            <ThemedText variant="h2" style={{ color: colors.white }}>{initials}</ThemedText>
          </View>
          <View style={{ marginLeft: spacing.lg, flex: 1 }}>
            <ThemedText variant="h2">{name}</ThemedText>
            <Badge
              label={profile.status}
              tone={profile.status === 'Active' ? 'success' : 'error'}
              style={{ marginTop: spacing.sm }}
            />
          </View>
        </View>

        {wallet && (
          <>
            <ThemedText variant="label" style={{ marginTop: spacing.xl, marginBottom: spacing.sm }}>Credit Pool</ThemedText>
            <Card>
              <Row label="OD Balance" value={fmt(wallet.odBalance)} valueColor={colors.label} />
              <Row
                label="Main Balance"
                value={`${wallet.displayBalance < 0 ? '-' : ''}${fmt(wallet.displayBalance)}`}
                valueColor={wallet.displayBalance < 0 ? colors.errorColor : colors.successColor}
              />
              <Button
                label="Recharge Wallet"
                icon="recharge"
                onPress={() => router.push('/wallet/recharge')}
                style={{ marginTop: spacing.md, backgroundColor: colors.accent }}
              />
            </Card>
            <ThemedText variant="muted" style={{ marginTop: spacing.sm }}>
              Your OD Limit is {fmt(wallet.permanentOdLimit)}
              {wallet.tempOdValid && wallet.tempOdBal > 0 ? ` · Temporary OD: ${fmt(wallet.tempOdBal)} (valid till ${wallet.tempOdExpiry})` : ''}
            </ThemedText>
          </>
        )}

        <Card style={{ marginTop: spacing.xl }}>
          <Row label="Email" value={profile.email} />
          <Row label="Mobile" value={profile.mobile} />
          <Row label="Account Type" value={profile.accountType} last={!memberSince} />
          {memberSince && <Row label="Member Since" value={memberSince} last />}
        </Card>

        {companyRows.length > 0 && (
          <>
            <ThemedText variant="label" style={{ marginTop: spacing.xl, marginBottom: spacing.sm }}>Company Details</ThemedText>
            <Card>
              {companyRows.map(([key, label], i) => (
                <Row key={key} label={label} value={profile[key]} last={i === companyRows.length - 1} />
              ))}
            </Card>
          </>
        )}

        <Button
          label="Change Password"
          variant="ghost"
          onPress={() => router.push('/change-password')}
          style={{ marginTop: spacing.xxl }}
        />
        <Button label="Log Out" variant="ghost" onPress={handleLogout} style={{ marginTop: spacing.md }} />
      </ScrollView>

      <AppDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
      {logoutConfirm}
    </SafeAreaView>
  )
}

function Row({ label, value, valueColor, last = false }) {
  return (
    <View style={[rowStyles.row, !last && rowStyles.divider]}>
      <ThemedText variant="muted">{label}</ThemedText>
      <ThemedText variant="bodyMedium" style={valueColor ? { color: valueColor } : undefined}>{value}</ThemedText>
    </View>
  )
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.creamAlt },
})

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  menuBtn: { alignSelf: 'flex-start' },
  avatarRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  avatar: {
    width: 64, height: 64, borderRadius: radius.pill,
    backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center',
  },
})
