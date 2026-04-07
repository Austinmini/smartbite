import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export interface TrendBucket {
  bucket: string
  avgPrice: number
  observationCount: number
}

interface Props {
  ingredient: string
  storeName: string
  data: TrendBucket[]
  days: 7 | 30 | 90
  onDaysChange: (days: 7 | 30 | 90) => void
}

const DAY_OPTIONS: Array<{ label: string; value: 7 | 30 | 90 }> = [
  { label: '7d', value: 7 },
  { label: '30d', value: 30 },
  { label: '90d', value: 90 },
]

export function PriceTrendChart({ ingredient, storeName, data, days, onDaysChange }: Props) {
  if (data.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.ingredient}>{ingredient}</Text>
        <Text style={styles.storeName}>{storeName}</Text>
        <View style={styles.toggleRow}>
          {DAY_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.toggleBtn, days === opt.value && styles.toggleBtnActive]}
              onPress={() => onDaysChange(opt.value)}
              testID={`trend-toggle-${opt.value}`}
            >
              <Text style={[styles.toggleText, days === opt.value && styles.toggleTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No price data yet</Text>
          <Text style={styles.emptySubtext}>Be the first to scan this item!</Text>
        </View>
      </View>
    )
  }

  const prices = data.map((d) => d.avgPrice)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const priceRange = maxPrice - minPrice || 1

  return (
    <View style={styles.container}>
      <Text style={styles.ingredient}>{ingredient}</Text>
      <Text style={styles.storeName}>{storeName}</Text>

      <View style={styles.toggleRow}>
        {DAY_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.toggleBtn, days === opt.value && styles.toggleBtnActive]}
            onPress={() => onDaysChange(opt.value)}
            testID={`trend-toggle-${opt.value}`}
          >
            <Text style={[styles.toggleText, days === opt.value && styles.toggleTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.chartArea}>
        <View style={styles.yAxis}>
          <Text style={styles.yLabel}>${maxPrice.toFixed(2)}</Text>
          <Text style={styles.yLabel}>${minPrice.toFixed(2)}</Text>
        </View>
        <View style={styles.bars}>
          {data.map((bucket, i) => {
            const heightPct = ((bucket.avgPrice - minPrice) / priceRange) * 70 + 10
            return (
              <View key={bucket.bucket} style={styles.barWrapper} testID={`price-bar-${i}`}>
                <View style={[styles.bar, { height: `${heightPct}%` }]} />
                <Text style={styles.barLabel}>
                  {new Date(bucket.bucket).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
                </Text>
              </View>
            )
          })}
        </View>
      </View>

      <Text style={styles.disclaimer}>
        Based on {data.reduce((s, d) => s + d.observationCount, 0)} community scans
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#fff' },
  ingredient: { fontSize: 20, fontWeight: '700', color: '#111827', textTransform: 'capitalize' },
  storeName: { fontSize: 14, color: '#6b7280', marginTop: 2, marginBottom: 16 },
  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  toggleBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
    minHeight: 36,
    justifyContent: 'center',
  },
  toggleBtnActive: { backgroundColor: '#dcfce7' },
  toggleText: { fontSize: 13, fontWeight: '600', color: '#4b5563' },
  toggleTextActive: { color: '#166534' },
  chartArea: {
    flexDirection: 'row',
    height: 160,
    gap: 8,
  },
  yAxis: {
    width: 48,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingVertical: 4,
  },
  yLabel: { fontSize: 11, color: '#6b7280' },
  bars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    paddingBottom: 24,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '80%',
    backgroundColor: '#22c55e',
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 9,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'center',
  },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#6b7280' },
  emptySubtext: { fontSize: 13, color: '#9ca3af' },
  disclaimer: { fontSize: 11, color: '#9ca3af', marginTop: 12, textAlign: 'center' },
})
