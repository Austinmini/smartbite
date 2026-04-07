import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

interface Props {
  tipId: string
  text: string
  onDismiss: (tipId: string) => void
}

export function TipBanner({ tipId, text, onDismiss }: Props) {
  return (
    <View style={styles.banner} testID={`tip-banner-${tipId}`}>
      <Text style={styles.icon} testID="tip-icon">💡</Text>
      <Text style={styles.text}>{text}</Text>
      <TouchableOpacity
        testID={`tip-dismiss-${tipId}`}
        style={styles.dismissBtn}
        onPress={() => onDismiss(tipId)}
        accessibilityLabel="Dismiss tip"
      >
        <Text style={styles.dismissText}>✕</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginVertical: 4,
  },
  icon: { fontSize: 18 },
  text: { flex: 1, fontSize: 13, color: '#92400e', lineHeight: 18 },
  dismissBtn: { minWidth: 28, minHeight: 28, alignItems: 'center', justifyContent: 'center' },
  dismissText: { fontSize: 13, color: '#a16207', fontWeight: '700' },
})
