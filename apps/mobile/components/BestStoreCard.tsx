import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

interface BestStoreCardProps {
  title: string
  storeName: string
  totalCost: number
  distanceMiles: number
  savingsLabel?: string
  totalLabel?: string
}

export function BestStoreCard({
  title,
  storeName,
  totalCost,
  distanceMiles,
  savingsLabel,
  totalLabel,
}: BestStoreCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>{title}</Text>
      <Text style={styles.storeName}>{storeName}</Text>
      <View style={styles.row}>
        <Text style={styles.total}>{totalLabel ?? `$${totalCost.toFixed(2)} total`}</Text>
        <Text style={styles.distance}>{distanceMiles.toFixed(1)} mi away</Text>
      </View>
      {savingsLabel ? <Text style={styles.savings}>{savingsLabel}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    backgroundColor: '#f0fdf4',
    padding: 18,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  eyebrow: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '700',
    color: '#15803d',
    marginBottom: 6,
  },
  storeName: { fontSize: 22, fontWeight: '700', color: '#14532d' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, gap: 12 },
  total: { fontSize: 15, fontWeight: '600', color: '#166534' },
  distance: { fontSize: 14, color: '#166534' },
  savings: { fontSize: 13, color: '#15803d', marginTop: 10 },
})
