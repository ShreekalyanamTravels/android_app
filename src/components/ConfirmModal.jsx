import { Modal, View, Pressable, StyleSheet } from 'react-native'
import ThemedText from './ThemedText'
import Button from './Button'
import { colors, spacing, radius } from '../theme/tokens'

// Alert.alert() is a no-op on react-native-web (confirmed in node_modules — its web
// implementation is a bare `static alert() {}`), so any confirm dialog needs a real in-app modal
// to actually show up when testing via the web preview, not just on native.
export default function ConfirmModal({ visible, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', destructive = false, onConfirm, onCancel }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <View style={styles.card}>
          <ThemedText variant="h3">{title}</ThemedText>
          {message && <ThemedText variant="muted" style={{ marginTop: spacing.sm }}>{message}</ThemedText>}
          <View style={styles.actions}>
            <Button label={cancelLabel} variant="ghost" onPress={onCancel} style={styles.actionBtn} />
            <Button
              label={confirmLabel}
              onPress={onConfirm}
              style={[styles.actionBtn, destructive && { backgroundColor: colors.errorColor }]}
            />
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(46,40,51,0.45)', padding: spacing.lg },
  card: { width: '100%', maxWidth: 360, backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg },
  actions: { flexDirection: 'row', marginTop: spacing.lg, gap: spacing.sm },
  actionBtn: { flex: 1 },
})
