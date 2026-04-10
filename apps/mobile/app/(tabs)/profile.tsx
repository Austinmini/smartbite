import React from 'react'
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, Share } from 'react-native'
import { useRouter } from 'expo-router'
import { apiClient } from '@/lib/apiClient'
import { useAuthStore } from '@/stores/authStore'
import { useProfileStore } from '@/stores/profileStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { FeedbackSheet } from '@/components/FeedbackSheet'
import { ReferralCard } from '@/components/ReferralCard'
import { TrialBanner } from '@/components/TrialBanner'
import { fetchSubscriptionStatus } from '@/lib/revenueCat'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  )
}

function PreferenceRow({ label, value, onEdit }: { label: string; value: string; onEdit?: () => void }) {
  return (
    <View style={styles.prefRow}>
      <View style={styles.prefInfo}>
        <Text style={styles.prefLabel}>{label}</Text>
        <Text style={styles.prefValue}>{value}</Text>
      </View>
      {onEdit && (
        <TouchableOpacity onPress={onEdit} style={styles.editBtn} accessibilityLabel={`Edit ${label}`}>
          <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

export default function ProfileScreen() {
  const router = useRouter()
  const { user, token, clearUser } = useAuthStore()
  const { weeklyBudget, preferredRetailers, dietaryGoals, allergies, cuisinePrefs, cookingTimeMax, servings } = useProfileStore()
  const { isTrial, daysRemaining, setStatus } = useSubscriptionStore()
  const [feedbackVisible, setFeedbackVisible] = React.useState(false)
  const [referralCode, setReferralCode] = React.useState<string | null>(null)
  const [referralStats, setReferralStats] = React.useState({ invited: 0, converted: 0, totalBitesEarned: 0 })

  React.useEffect(() => {
    if (!token) return
    let active = true

    Promise.all([
      apiClient.get<{ code: string }>('/referral/code', token),
      apiClient.get<{ invited: number; converted: number; totalBitesEarned: number }>('/referral/stats', token),
      fetchSubscriptionStatus(token),
    ])
      .then(([code, stats, subStatus]) => {
        if (!active) return
        setReferralCode(code.code)
        setReferralStats(stats)
        if (subStatus) {
          setStatus({
            isTrial: subStatus.isTrial,
            trialEndsAt: subStatus.trialEndsAt,
            daysRemaining: subStatus.daysRemaining,
            renewalDate: subStatus.renewalDate,
          })
        }
      })
      .catch(() => {})

    return () => {
      active = false
    }
  }, [token])

  async function handleLogout() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.post('/auth/logout', {}, token ?? undefined)
          } catch { /* ignore errors */ }
          clearUser()
        },
      },
    ])
  }

  async function handleFeedbackSubmit(payload: {
    type: 'BUG' | 'FEATURE_REQUEST' | 'PRICE_ISSUE' | 'GENERAL'
    subject?: string
    body: string
  }) {
    try {
      await apiClient.post('/feedback', payload, token ?? undefined)
      setFeedbackVisible(false)
      Alert.alert('Thanks!', "We'll review your feedback.")
    } catch (err: any) {
      Alert.alert('Could not send feedback', err.message ?? 'Please try again.')
    }
  }

  async function handleShareReferral() {
    if (!referralCode) return
    await Share.share({
      message: `Use my SmartBite code ${referralCode} and we both earn 150 Bites.`,
    })
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TrialBanner
        isTrial={isTrial}
        daysRemaining={daysRemaining}
        onPress={() => router.push('/paywall')}
      />
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.email}>{user?.email}</Text>
      <View style={styles.tierBadge}>
        <Text style={styles.tierText}>{user?.tier ?? 'FREE'}</Text>
      </View>

      <Section title="Shopping">
        <PreferenceRow
          label="Weekly budget"
          value={`$${weeklyBudget}`}
          onEdit={() => router.push('/(auth)/onboarding/budget')}
        />
        <PreferenceRow
          label="Preferred stores"
          value={preferredRetailers.length > 0 ? preferredRetailers.join(', ') : 'None selected'}
          onEdit={() => router.push('/(auth)/onboarding/location')}
        />
      </Section>

      <Section title="Dietary">
        <PreferenceRow
          label="Goals"
          value={dietaryGoals.length > 0 ? dietaryGoals.join(', ') : 'None set'}
          onEdit={() => router.push('/(auth)/onboarding/dietary')}
        />
        <PreferenceRow
          label="Allergies"
          value={allergies.length > 0 ? allergies.join(', ') : 'None'}
          onEdit={() => router.push('/(auth)/onboarding/dietary')}
        />
        {cuisinePrefs.length > 0 && (
          <PreferenceRow label="Cuisines" value={cuisinePrefs.join(', ')} />
        )}
        <PreferenceRow label="Max cook time" value={`${cookingTimeMax} min`} />
        <PreferenceRow label="Servings" value={String(servings)} />
      </Section>

      <Section title="Account">
        <PreferenceRow
          label="Subscription"
          value={isTrial ? `Pro Trial · ${daysRemaining ?? 0} days left` : (user?.tier ?? 'Free')}
          onEdit={() => router.push('/paywall')}
        />
        <PreferenceRow
          label="Bites & Rewards"
          value="Balance, badges, leaderboard"
          onEdit={() => router.push('/(tabs)/rewards')}
        />
        <PreferenceRow
          label="Reminders"
          value="Restock reminders for staples"
          onEdit={() => router.push('/(tabs)/reminders')}
        />
      </Section>

      {referralCode ? (
        <Section title="Referral">
          <ReferralCard
            code={referralCode}
            invited={referralStats.invited}
            converted={referralStats.converted}
            onShare={handleShareReferral}
          />
          <Text style={styles.referralNote}>
            {referralStats.totalBitesEarned} total Bites earned from referrals.
          </Text>
        </Section>
      ) : null}

      <TouchableOpacity style={styles.feedbackBtn} onPress={() => setFeedbackVisible(true)}>
        <Text style={styles.feedbackText}>Send feedback</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign out</Text>
      </TouchableOpacity>

      <FeedbackSheet
        visible={feedbackVisible}
        onClose={() => setFeedbackVisible(false)}
        onSubmit={handleFeedbackSubmit}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 28, fontWeight: '700', color: '#1a1a1a', marginTop: 16 },
  email: { fontSize: 15, color: '#6b7280', marginTop: 4 },
  tierBadge: { alignSelf: 'flex-start', backgroundColor: '#f0fdf4', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8, marginBottom: 24 },
  tierText: { fontSize: 12, fontWeight: '700', color: '#15803d', letterSpacing: 0.5 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#9ca3af', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 },
  prefRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  prefInfo: { flex: 1 },
  prefLabel: { fontSize: 14, color: '#374151', fontWeight: '500' },
  prefValue: { fontSize: 14, color: '#6b7280', marginTop: 2, textTransform: 'capitalize' },
  editBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#f3f4f6', minHeight: 44, justifyContent: 'center' },
  editText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  feedbackBtn: { marginTop: 8, marginBottom: 12, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#0f766e', alignItems: 'center', minHeight: 44 },
  feedbackText: { color: '#0f766e', fontSize: 16, fontWeight: '600' },
  referralNote: { fontSize: 13, color: '#64748b', marginTop: 10 },
  logoutBtn: { marginTop: 8, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#ef4444', alignItems: 'center', minHeight: 44 },
  logoutText: { color: '#ef4444', fontSize: 16, fontWeight: '600' },
})
