import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

interface Props {
  code: string
  invited: number
  converted: number
  onShare: () => void
}

export function ReferralCard({ code, invited, converted, onShare }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Referral code</Text>
      <Text style={styles.code}>{code}</Text>
      <View style={styles.statsRow}>
        <Text style={styles.stat}>{invited} invited</Text>
        <Text style={styles.stat}>{converted} converted</Text>
      </View>
      <TouchableOpacity testID="referral-share-btn" style={styles.shareBtn} onPress={onShare}>
        <Text style={styles.shareText}>Share with a friend</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 18,
    padding: 18,
    marginTop: 10,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#93c5fd',
  },
  code: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 2,
    color: '#fff',
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 10,
  },
  stat: {
    fontSize: 14,
    color: '#cbd5e1',
    fontWeight: '600',
  },
  shareBtn: {
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: '#38bdf8',
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareText: {
    color: '#082f49',
    fontSize: 15,
    fontWeight: '800',
  },
})
