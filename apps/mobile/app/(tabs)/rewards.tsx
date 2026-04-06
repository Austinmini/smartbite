import React from 'react'
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { apiClient } from '../../lib/apiClient'

interface Balance { balance: number; lifetimeEarned: number }

interface LedgerEntry {
  id: string
  amount: number
  reason: string
  createdAt: string
}

interface Badge {
  badge: string
  earned: boolean
  earnedAt: string | null
}

interface LeaderboardEntry {
  rank: number
  userId: string
  balance: number
  isCurrentUser: boolean
}

const BADGE_LABELS: Record<string, { label: string; emoji: string }> = {
  FIRST_SCAN:     { label: 'First Scan',       emoji: '📸' },
  STREAK_7_DAY:   { label: '7-Day Streak',      emoji: '🔥' },
  STREAK_30_DAY:  { label: '30-Day Streak',     emoji: '🏆' },
  PIONEER:        { label: 'Pioneer',           emoji: '🗺️' },
  VERIFIED:       { label: 'Verified Scanner',  emoji: '✅' },
  CENTURY:        { label: 'Century',           emoji: '💯' },
  PRICE_CHAMPION: { label: 'Price Champion',    emoji: '👑' },
  COMMUNITY_HERO: { label: 'Community Hero',    emoji: '🦸' },
}

const REASON_LABELS: Record<string, string> = {
  WELCOME_BONUS:  'Welcome bonus',
  PRICE_SCAN:     'Price scan',
  PIONEER_SCAN:   'Pioneer scan',
  VERIFIED_SCAN:  'Verified scan',
  STALE_UPDATE:   'Stale price update',
  STREAK_7_DAY:   '7-day streak',
  STREAK_30_DAY:  '30-day streak',
  WEEKLY_GOAL:    'Weekly goal',
  REFERRAL_BONUS: 'Referral',
  REDEMPTION:     'Redemption',
  ADMIN_ADJUSTMENT: 'Adjustment',
}

export default function RewardsScreen() {
  const [balance, setBalance] = React.useState<Balance | null>(null)
  const [ledger, setLedger] = React.useState<LedgerEntry[]>([])
  const [badges, setBadges] = React.useState<Badge[]>([])
  const [leaderboard, setLeaderboard] = React.useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function loadAll(quiet = false) {
    if (!quiet) setLoading(true)
    setError(null)
    try {
      const [bal, led, bdg, lb] = await Promise.all([
        apiClient.get<Balance>('/rewards/balance'),
        apiClient.get<{ entries: LedgerEntry[]; total: number }>('/rewards/ledger?limit=10'),
        apiClient.get<{ badges: Badge[] }>('/rewards/badges'),
        apiClient.get<{ leaderboard: LeaderboardEntry[] }>('/rewards/leaderboard?limit=10'),
      ])
      setBalance(bal)
      setLedger(led.entries)
      setBadges(bdg.badges)
      setLeaderboard(lb.leaderboard)
    } catch (err: any) {
      setError(err.message ?? 'Could not load rewards.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  React.useEffect(() => { loadAll() }, [])

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAll(true) }} tintColor="#22c55e" />
      }
    >
      <Text style={styles.title}>Bites Rewards</Text>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Balance card */}
      {balance && (
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Your balance</Text>
          <Text style={styles.balanceAmount}>{balance.balance.toLocaleString()}</Text>
          <Text style={styles.balanceCurrency}>Bites</Text>
          <Text style={styles.lifetimeLabel}>
            {balance.lifetimeEarned.toLocaleString()} Bites earned lifetime
          </Text>
        </View>
      )}

      {/* Badges */}
      <Text style={styles.sectionTitle}>Badges</Text>
      <View style={styles.badgeGrid}>
        {badges.map((b) => {
          const meta = BADGE_LABELS[b.badge] ?? { label: b.badge, emoji: '🏅' }
          return (
            <View key={b.badge} style={[styles.badgeCard, !b.earned && styles.badgeCardLocked]}>
              <Text style={styles.badgeEmoji}>{meta.emoji}</Text>
              <Text style={[styles.badgeLabel, !b.earned && styles.badgeLabelLocked]}>
                {meta.label}
              </Text>
              {b.earned && b.earnedAt && (
                <Text style={styles.badgeDate}>
                  {new Date(b.earnedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </Text>
              )}
              {!b.earned && <Text style={styles.badgeLock}>🔒</Text>}
            </View>
          )
        })}
      </View>

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Leaderboard</Text>
          <View style={styles.leaderboardCard}>
            {leaderboard.map((entry) => (
              <View
                key={entry.rank}
                style={[styles.leaderRow, entry.isCurrentUser && styles.leaderRowSelf]}
              >
                <Text style={styles.leaderRank}>#{entry.rank}</Text>
                <Text style={styles.leaderName} numberOfLines={1}>
                  {entry.isCurrentUser ? 'You' : `User ${entry.rank}`}
                </Text>
                <Text style={styles.leaderBalance}>
                  {entry.balance.toLocaleString()} Bites
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Recent activity */}
      {ledger.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Recent activity</Text>
          <View style={styles.ledgerCard}>
            {ledger.map((entry) => (
              <View key={entry.id} style={styles.ledgerRow}>
                <View style={styles.ledgerInfo}>
                  <Text style={styles.ledgerReason}>
                    {REASON_LABELS[entry.reason] ?? entry.reason}
                  </Text>
                  <Text style={styles.ledgerDate}>
                    {new Date(entry.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
                <Text style={[styles.ledgerAmount, entry.amount < 0 && styles.ledgerAmountNeg]}>
                  {entry.amount > 0 ? '+' : ''}{entry.amount}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      {ledger.length === 0 && badges.every((b) => !b.earned) && !error && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No activity yet</Text>
          <Text style={styles.emptyBody}>
            Scan grocery prices to earn Bites, unlock badges, and climb the leaderboard.
          </Text>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 24, paddingBottom: 48 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 20 },
  errorBox: {
    backgroundColor: '#fef2f2', borderRadius: 8, padding: 12,
    marginBottom: 16, borderWidth: 1, borderColor: '#fecaca',
  },
  errorText: { color: '#dc2626', fontSize: 14 },

  // Balance card
  balanceCard: {
    backgroundColor: '#16a34a', borderRadius: 20, padding: 24,
    alignItems: 'center', marginBottom: 28,
  },
  balanceLabel: { color: '#bbf7d0', fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
  balanceAmount: { color: '#fff', fontSize: 56, fontWeight: '700', lineHeight: 64, marginTop: 4 },
  balanceCurrency: { color: '#bbf7d0', fontSize: 16, fontWeight: '600', marginTop: -4 },
  lifetimeLabel: { color: '#86efac', fontSize: 12, marginTop: 12 },

  sectionTitle: {
    fontSize: 13, fontWeight: '600', color: '#9ca3af',
    letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 12, marginTop: 4,
  },

  // Badges
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  badgeCard: {
    width: '47%', backgroundColor: '#fff', borderRadius: 14,
    padding: 14, alignItems: 'center', gap: 4,
  },
  badgeCardLocked: { backgroundColor: '#f3f4f6', opacity: 0.7 },
  badgeEmoji: { fontSize: 28 },
  badgeLabel: { fontSize: 13, fontWeight: '600', color: '#111827', textAlign: 'center' },
  badgeLabelLocked: { color: '#9ca3af' },
  badgeDate: { fontSize: 11, color: '#6b7280' },
  badgeLock: { fontSize: 14 },

  // Leaderboard
  leaderboardCard: { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', marginBottom: 28 },
  leaderRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f3f4f6',
  },
  leaderRowSelf: { backgroundColor: '#f0fdf4' },
  leaderRank: { width: 32, fontSize: 14, fontWeight: '700', color: '#6b7280' },
  leaderName: { flex: 1, fontSize: 15, color: '#111827', fontWeight: '500' },
  leaderBalance: { fontSize: 14, fontWeight: '600', color: '#16a34a' },

  // Ledger
  ledgerCard: { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', marginBottom: 28 },
  ledgerRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f3f4f6',
  },
  ledgerInfo: { flex: 1 },
  ledgerReason: { fontSize: 14, color: '#111827', fontWeight: '500' },
  ledgerDate: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  ledgerAmount: { fontSize: 15, fontWeight: '700', color: '#16a34a' },
  ledgerAmountNeg: { color: '#dc2626' },

  // Empty
  emptyState: { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
  emptyBody: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 21 },
})
