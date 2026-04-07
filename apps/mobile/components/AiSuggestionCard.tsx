import React from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

type Recommendation = 'buy' | 'hold' | 'substitute' | null

interface Props {
  recommendation: Recommendation
  reasoning: string | null
  tier: 'FREE' | 'PLUS' | 'PRO'
  loading?: boolean
  onUpgrade: () => void
}

const BADGE_CONFIG: Record<NonNullable<Recommendation>, { label: string; bg: string; text: string }> = {
  buy: { label: '↓ Buy now', bg: '#dcfce7', text: '#166534' },
  hold: { label: '→ Hold', bg: '#f3f4f6', text: '#374151' },
  substitute: { label: '⇄ Substitute', bg: '#fef3c7', text: '#92400e' },
}

export function AiSuggestionCard({ recommendation, reasoning, tier, loading = false, onUpgrade }: Props) {
  if (tier === 'FREE' || tier === 'PLUS') {
    return (
      <View style={styles.upgradeCard}>
        <Text style={styles.upgradeTitle}>AI price suggestion</Text>
        <Text style={styles.upgradeBody}>
          Get Claude-powered buy, hold, or substitute recommendations based on real price trends. Available on Pro.
        </Text>
        <TouchableOpacity
          testID="ai-suggestion-upgrade-btn"
          style={styles.upgradeBtn}
          onPress={onUpgrade}
        >
          <Text style={styles.upgradeBtnText}>Upgrade to Pro →</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={styles.card} testID="ai-suggestion-loading">
        <ActivityIndicator color="#22c55e" />
        <Text style={styles.loadingText}>Analysing price trends…</Text>
      </View>
    )
  }

  if (!recommendation || !reasoning) return null

  const badge = BADGE_CONFIG[recommendation]

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.cardTitle}>AI price suggestion</Text>
        <View style={[styles.badge, { backgroundColor: badge.bg }]} testID={`suggestion-badge-${recommendation}`}>
          <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
        </View>
      </View>
      <Text style={styles.reasoning}>{reasoning}</Text>
      <Text style={styles.attribution}>Powered by Claude</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  badgeText: { fontSize: 12, fontWeight: '700' },
  reasoning: { fontSize: 14, color: '#374151', lineHeight: 20 },
  attribution: { fontSize: 11, color: '#9ca3af' },
  loadingText: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
  upgradeCard: {
    backgroundColor: '#f5f3ff',
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e9d5ff',
  },
  upgradeTitle: { fontSize: 14, fontWeight: '700', color: '#5b21b6' },
  upgradeBody: { fontSize: 13, color: '#6d28d9', lineHeight: 18 },
  upgradeBtn: {
    backgroundColor: '#7c3aed',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
    minHeight: 44,
  },
  upgradeBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
})
