import { useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Modal } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from '../../src/components/Icon'
import { colors, spacing, radius, fonts } from '../../src/theme/tokens'
import { getTraveller, setTraveller } from '../../src/services/insuranceDraftStore'

const SALUTATIONS = ['Mr', 'Ms', 'Mrs', 'Master']
const RELATIONSHIPS = ['Self', 'Spouse', 'Son', 'Daughter', 'Father', 'Mother', 'Brother', 'Sister', 'Other']
const NATIONALITIES = ['Indian', 'American', 'British', 'Emirati', 'Singaporean', 'Other']

function formatDMY(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function Field({ value, onChangeText, placeholder }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textFaint}
      style={styles.input}
    />
  )
}

export default function TravellerDetails() {
  const router = useRouter()
  const { index, relationship: relationshipParam, dob } = useLocalSearchParams()
  const i = Number(index) || 0
  const existing = getTraveller(i)

  const [salutation, setSalutation] = useState(existing?.salutation || '')
  const [firstName, setFirstName] = useState(existing?.firstName || '')
  const [lastName, setLastName] = useState(existing?.lastName || '')
  const [passport, setPassport] = useState(existing?.passport || '')
  const [relationship, setRelationship] = useState(existing?.relationship || relationshipParam || (i === 0 ? 'Self' : ''))
  const [nationality, setNationality] = useState(existing?.nationality || 'Indian')
  const [nomineeFirst, setNomineeFirst] = useState(existing?.nomineeFirst || '')
  const [nomineeLast, setNomineeLast] = useState(existing?.nomineeLast || '')
  const [error, setError] = useState('')

  const [listPicker, setListPicker] = useState(null)

  function save() {
    if (!salutation) return setError('Please select a title.')
    if (!firstName.trim() || !lastName.trim()) return setError('Please enter first and last name.')
    if (!passport.trim()) return setError('Please enter the passport number.')
    setError('')
    setTraveller(i, { salutation, firstName, lastName, dob, passport, relationship, nationality, nomineeFirst, nomineeLast })
    router.back()
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.hero}>
        <View style={styles.heroRow}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Icon name="chevron-left" size={20} color={colors.onDark} />
          </Pressable>
          <Text style={styles.heroTitle}>Traveler Details</Text>
          <View style={{ width: 20 }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: 14, paddingBottom: spacing.xxl }}>
        <View style={styles.card}>
          <View style={styles.salutationRow}>
            {SALUTATIONS.map(s => (
              <Pressable key={s} style={[styles.salutationPill, salutation === s && styles.salutationPillActive]} onPress={() => setSalutation(s)}>
                <Text style={[styles.salutationText, salutation === s && styles.salutationTextActive]}>{s}</Text>
              </Pressable>
            ))}
          </View>

          <Field value={firstName} onChangeText={setFirstName} placeholder="First Name" />
          <Field value={lastName} onChangeText={setLastName} placeholder="Last Name" />

          <View>
            <Text style={styles.fieldLabel}>Date of birth</Text>
            <View style={[styles.input, styles.inputDisabled]}>
              <Text style={styles.dobText}>{formatDMY(dob)}</Text>
            </View>
          </View>

          <Field value={passport} onChangeText={setPassport} placeholder="Passport Number" />

          <Pressable
            style={[styles.input, styles.dropdownRow, i === 0 && styles.inputDisabled]}
            onPress={() => i !== 0 && setListPicker({ title: 'Select relationship', options: RELATIONSHIPS, onSelect: setRelationship })}
          >
            <Text style={styles.dropdownText}>{relationship.toUpperCase()}</Text>
            {i !== 0 && <Icon name="chevron-down" size={15} color={colors.textFaint} />}
          </Pressable>

          <Pressable
            style={[styles.input, styles.dropdownRow]}
            onPress={() => setListPicker({ title: 'Select nationality', options: NATIONALITIES, onSelect: setNationality })}
          >
            <Text style={styles.dropdownText}>{nationality.toUpperCase()}</Text>
            <Icon name="chevron-down" size={15} color={colors.textFaint} />
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Nominee Details</Text>
          <Field value={nomineeFirst} onChangeText={setNomineeFirst} placeholder="Nominee First Name" />
          <Field value={nomineeLast} onChangeText={setNomineeLast} placeholder="Nominee Last Name" />
        </View>

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

  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 14, gap: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.primaryDark },

  salutationRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  salutationPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.border },
  salutationPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  salutationText: { fontSize: 13, fontWeight: '600', color: colors.textDark },
  salutationTextActive: { color: colors.onDark },

  input: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 18, paddingVertical: 14, fontSize: 14, color: colors.textDark },
  inputDisabled: { backgroundColor: colors.cream },
  dropdownRow: { flexDirection: 'row' },
  dropdownText: { fontSize: 14, color: colors.textDark, letterSpacing: 0.3 },
  dobText: { fontSize: 14, color: colors.textDark },
  fieldLabel: { fontSize: 11.5, color: colors.textFaint, marginBottom: 6, marginLeft: 4 },

  error: { color: colors.errorColor, fontSize: 12, textAlign: 'center' },

  saveBtn: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: radius.pill },
  saveBtnText: { fontSize: 14, fontWeight: '600', color: colors.onDark, letterSpacing: 0.3 },

  modalRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(46,40,51,0.45)' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider, marginBottom: 4 },
  sheetTitle: { fontSize: 14, fontWeight: '500', color: colors.textDark },
  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.divider },
  pickerRowTitle: { fontSize: 14, fontWeight: '500', color: colors.textDark },
})
