import { useRef } from 'react'
import { View, TextInput, StyleSheet } from 'react-native'
import { colors, radius, fonts } from '../theme/tokens'

// Six single-digit boxes backed by one string value, so callers keep using the same
// `value`/`onChangeText` shape as a plain TextInput (no OTP_RE.test(otp) call site had to change).
// Handles digit-by-digit typing, backspace-to-previous-box, and pasting a full 6-digit code into
// any box.
export default function OtpInput({ value, onChangeText, length = 6, autoFocus = false }) {
  const inputRefs = useRef([])
  const digits = Array.from({ length }, (_, i) => value[i] || '')

  function setDigitAt(index, char) {
    const next = digits.slice()
    next[index] = char
    onChangeText(next.join(''))
  }

  function handleChange(index, text) {
    const clean = text.replace(/\D/g, '')

    if (clean.length > 1) {
      // Pasted (or autofilled) a full code — fill from this box onward.
      const next = digits.slice()
      for (let i = 0; i < clean.length && index + i < length; i++) next[index + i] = clean[i]
      onChangeText(next.join(''))
      const lastFilled = Math.min(index + clean.length, length) - 1
      inputRefs.current[lastFilled]?.focus()
      return
    }

    setDigitAt(index, clean)
    if (clean && index < length - 1) inputRefs.current[index + 1]?.focus()
  }

  function handleKeyPress(index, e) {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
      setDigitAt(index - 1, '')
    }
  }

  return (
    <View style={styles.row}>
      {digits.map((digit, i) => (
        <TextInput
          key={i}
          ref={el => { inputRefs.current[i] = el }}
          value={digit}
          onChangeText={text => handleChange(i, text)}
          onKeyPress={e => handleKeyPress(i, e)}
          keyboardType="number-pad"
          maxLength={i === 0 ? length : 1}
          autoFocus={autoFocus && i === 0}
          style={[styles.box, digit && styles.boxFilled]}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  box: {
    flex: 1, minWidth: 0, height: 48,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    backgroundColor: colors.white, fontFamily: fonts.bodySemiBold, fontSize: 18, color: colors.textDark,
    textAlign: 'center', textAlignVertical: 'center', padding: 0,
  },
  boxFilled: { borderColor: colors.primary },
})
