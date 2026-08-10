import { useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Modal } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from '../../src/components/Icon'
import { colors, spacing, radius, fonts } from '../../src/theme/tokens'
import { getProposer, setProposer } from '../../src/services/insuranceDraftStore'

const COUNTRIES = ['Indian', 'American', 'British', 'Emirati', 'Singaporean', 'Other']
const KYC_MODES = ['CKYC', 'Aadhaar', 'PAN Card']

function Field({ value, onChangeText, placeholder, keyboardType }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textFaint}
      keyboardType={keyboardType}
      style={styles.input}
    />
  )
}

function DropdownField({ value, onPress }) {
  return (
    <Pressable style={styles.input} onPress={onPress}>
      <Text style={styles.dropdownText}>{value}</Text>
      <Icon name="chevron-down" size={15} color={colors.textFaint} />
    </Pressable>
  )
}

export default function ProposerDetails() {
  const router = useRouter()
  const existing = getProposer()

  const [country, setCountry] = useState(existing?.country || 'Indian')
  const [mobile, setMobile] = useState(existing?.mobile || '')
  const [email, setEmail] = useState(existing?.email || '')
  const [address1, setAddress1] = useState(existing?.address1 || '')
  const [address2, setAddress2] = useState(existing?.address2 || '')
  const [gst, setGst] = useState(existing?.gst || '')
  const [state, setState] = useState(existing?.state || '')
  const [district, setDistrict] = useState(existing?.district || '')
  const [city, setCity] = useState(existing?.city || '')
  const [pincode, setPincode] = useState(existing?.pincode || '')
  const [kyc, setKyc] = useState(existing?.kyc || 'CKYC')
  const [error, setError] = useState('')

  const [listPicker, setListPicker] = useState(null)

  function save() {
    if (!mobile.trim()) return setError('Please enter a mobile number.')
    if (!email.trim()) return setError('Please enter an email ID.')
    if (!address1.trim()) return setError('Please enter your address.')
    if (!state.trim() || !district.trim() || !city.trim() || !pincode.trim()) return setError('Please fill in state, district, city and pincode.')
    setError('')
    setProposer({ country, mobile, email, address1, address2, gst, state, district, city, pincode, kyc })
    router.back()
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.hero}>
        <View style={styles.heroRow}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Icon name="chevron-left" size={20} color={colors.onDark} />
          </Pressable>
          <Text style={styles.heroTitle}>Proposer Details</Text>
          <View style={{ width: 20 }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: 12, paddingBottom: spacing.xxl }}>
        <DropdownField value={country} onPress={() => setListPicker({ title: 'Select country', options: COUNTRIES, onSelect: setCountry })} />
        <Field value={mobile} onChangeText={setMobile} placeholder="Mobile Number" keyboardType="phone-pad" />
        <Field value={email} onChangeText={setEmail} placeholder="Email Id" keyboardType="email-address" />
        <Field value={address1} onChangeText={setAddress1} placeholder="Enter Address" />
        <Field value={address2} onChangeText={setAddress2} placeholder="Enter Address" />
        <Field value={gst} onChangeText={setGst} placeholder="Gst Number (Optional)" />
        <Field value={state} onChangeText={setState} placeholder="State" />
        <Field value={district} onChangeText={setDistrict} placeholder="District" />
        <Field value={city} onChangeText={setCity} placeholder="City" />
        <Field value={pincode} onChangeText={setPincode} placeholder="Pincode" keyboardType="number-pad" />
        <DropdownField value={kyc} onPress={() => setListPicker({ title: 'Select KYC mode', options: KYC_MODES, onSelect: setKyc })} />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={styles.saveBtn} onPress={save}>
          <Text style={styles.saveBtnText}>Save</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={!!listPicker} transparent animationType="slide" onRequestClose={() => setListPicker(null)}>
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setListPicker(null)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{listPicker?.title}</Text>
              <Pressable onPress={() => setListPicker(null)} hitSlop={10}>
                <Icon name="x" size={18} color={colors.primary} />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 360 }}>
              {listPicker?.options.map(opt => (
                <Pressable key={opt} style={styles.pickerRow} onPress={() => { listPicker.onSelect(opt); setListPicker(null) }}>
                  <Text style={styles.pickerRowTitle}>{opt}</Text>
                  <Icon name="chevron-right" size={14} color={colors.textFaint} />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  hero: { backgroundColor: colors.primaryDark, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: 16 },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroTitle: { fontFamily: fonts.heading, fontSize: 18, fontWeight: '500', color: colors.onDark },

  input: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 18, paddingVertical: 14, fontSize: 14, color: colors.textDark },
  dropdownText: { fontSize: 14, color: colors.textDark },

  error: { color: colors.errorColor, fontSize: 12, textAlign: 'center' },

  saveBtn: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: radius.pill, marginTop: spacing.sm },
  saveBtnText: { fontSize: 14, fontWeight: '600', color: colors.onDark, letterSpacing: 0.3 },

  modalRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(46,40,51,0.45)' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider, marginBottom: 4 },
  sheetTitle: { fontSize: 14, fontWeight: '500', color: colors.textDark },
  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.divider },
  pickerRowTitle: { fontSize: 14, fontWeight: '500', color: colors.textDark },
})
