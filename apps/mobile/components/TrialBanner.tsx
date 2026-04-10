import React from 'react'
import { StyleSheet, Text, TouchableOpacity } from 'react-native'

interface Props {
  isTrial: boolean
  daysRemaining: number | null
  onPress: () => void
}

export function TrialBanner({ isTrial, daysRemaining, onPress }: Props) {
  if (!isTrial) return null

  const label =
    daysRemaining === 0
      ? 'Pro Trial · last day'
      : `Pro Trial · ${daysRemaining} days left`

  return (
    <TouchableOpacity style={styles.banner} onPress={onPress} accessibilityLabel={label}>
      <Text style={styles.text}>{label}</Text>
      <Text style={styles.cta}>Upgrade →</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f766e',
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
  },
  text: { fontSize: 13, color: '#fff', fontWeight: '600' },
  cta: { fontSize: 13, color: '#99f6e4', fontWeight: '600' },
})
