import { Pressable, View, StyleSheet, Alert } from 'react-native'
import ThemedText from './ThemedText'
import Badge from './Badge'
import { DOC_STATUS_STYLES } from '../data/documentsData'
import { colors, radius, spacing } from '../theme/tokens'

export default function DocumentRow({ doc }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <ThemedText variant="bodyMedium">{doc.type}</ThemedText>
        <ThemedText variant="muted" style={{ marginTop: 2 }}>{doc.ref} · {doc.date}</ThemedText>
      </View>
      {doc.amount != null && (
        <ThemedText variant="bodyMedium" style={{ marginRight: spacing.md }}>₹{doc.amount.toLocaleString('en-IN')}</ThemedText>
      )}
      <Badge label={doc.status} tone={DOC_STATUS_STYLES[doc.status] || 'info'} style={{ marginRight: spacing.md }} />
      <Pressable onPress={() => Alert.alert('Download', `${doc.ref} would download here.`)} style={styles.downloadBtn}>
        <ThemedText variant="bodyMedium" style={{ color: colors.gold, fontSize: 12 }}>Download</ThemedText>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.creamAlt,
  },
  downloadBtn: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.gold,
  },
})
