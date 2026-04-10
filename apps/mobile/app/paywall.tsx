import React from 'react'
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { fetchSubscriptionStatus, purchaseProduct, restorePurchases, syncSubscription } from '@/lib/revenueCat'

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    description: 'For community contributors',
    features: [
      '2 meal plans per week',
      '10 saved recipes',
      '1 collection',
      'Community price scanning',
      'Shopping list',
    ],
    productId: null,
    cta: null,
  },
  {
    id: 'plus',
    name: 'Plus',
    price: '$4.99/mo',
    description: 'For regular meal planners',
    features: [
      '7 meal plans per week',
      'Unlimited saved recipes',
      'Unlimited collections',
      'AI personalisation',
      'Price drop alerts',
    ],
    productId: 'com.savvyspoon.plus.monthly',
    cta: 'Start free trial',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$9.99/mo',
    description: 'For serious savers',
    features: [
      'Unlimited meal plans',
      'Price trend charts',
      'AI buy/hold suggestions',
      'Restock reminders',
      'Family profiles (5)',
    ],
    productId: 'com.savvyspoon.pro.monthly',
    cta: 'Start free trial',
    highlight: true,
  },
] as const

export default function PaywallScreen() {
  const router = useRouter()
  const { user, token } = useAuthStore()
  const { isTrial: storedIsTrial, daysRemaining: storedDaysRemaining, setStatus } = useSubscriptionStore()
  const [isTrial, setIsTrial] = React.useState(storedIsTrial)
  const [daysRemaining, setDaysRemaining] = React.useState(storedDaysRemaining)

  // Fetch fresh status on mount — ensures correct copy even if store hasn't loaded yet
  React.useEffect(() => {
    if (!token) return
    fetchSubscriptionStatus(token).then((status) => {
      if (!status) return
      setIsTrial(status.isTrial)
      setDaysRemaining(status.daysRemaining)
      setStatus({
        isTrial: status.isTrial,
        trialEndsAt: status.trialEndsAt,
        daysRemaining: status.daysRemaining,
        renewalDate: status.renewalDate,
      })
    }).catch(() => {})
  }, [token])

  // isTrial = currently on a Pro trial (new signup, not yet paid)
  // hasUsedTrial = trial over, FREE tier, show "get it back" copy
  const hasUsedTrial = !isTrial && (user?.tier === 'FREE')

  async function handlePurchase(productId: string) {
    try {
      const success = await purchaseProduct(productId)
      if (success) {
        const newTier = await syncSubscription(token ?? undefined)
        Alert.alert(
          'Welcome!',
          `You're now on ${newTier}. Enjoy all your new features.`,
          [{ text: 'Let\'s go', onPress: () => router.back() }]
        )
      }
    } catch (err: any) {
      Alert.alert('Purchase failed', err.message ?? 'Please try again.')
    }
  }

  async function handleRestore() {
    try {
      const tier = await restorePurchases()
      if (tier !== 'FREE') {
        await syncSubscription(token ?? undefined)
        Alert.alert('Restored!', `Your ${tier} subscription has been restored.`, [
          { text: 'Continue', onPress: () => router.back() },
        ])
      } else {
        Alert.alert('No subscription found', 'No previous purchase was found to restore.')
      }
    } catch {
      Alert.alert('Restore failed', 'Please try again.')
    }
  }

  const currentTier = user?.tier ?? 'FREE'

  // Per-plan CTA label based on trial state
  function getCtaLabel(planId: string, defaultCta: string): string {
    if (isTrial) {
      // Already on a Pro trial — lock it in
      if (planId === 'pro') return `Upgrade to keep Pro · $9.99/mo`
      if (planId === 'plus') return `Switch to Plus · $4.99/mo`
    }
    if (hasUsedTrial) {
      // Trial ended — "get it back" framing
      if (planId === 'pro') return `Get Pro back · $9.99/mo`
    }
    return defaultCta
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>
        {isTrial
          ? `Pro Trial · ${daysRemaining ?? 0} days left`
          : hasUsedTrial
            ? 'Your Pro trial has ended'
            : 'Unlock the full SavvySpoon'}
      </Text>
      <Text style={styles.sub}>
        {isTrial
          ? 'Lock in your plan now to keep all Pro features after your trial.'
          : hasUsedTrial
            ? 'Keep the tools you loved during your trial.'
            : 'Start your 7-day free Pro trial — no credit card required.'}
      </Text>

      {PLANS.map((plan) => {
        const isCurrent = plan.id.toUpperCase() === currentTier && !isTrial
        const isTrialPlan = isTrial && plan.id === 'pro'
        return (
          <View
            key={plan.id}
            style={[styles.planCard, plan.highlight && styles.planCardHighlight]}
            testID={`plan-${plan.id}`}
          >
            {isTrialPlan && (
              <Text style={styles.trialBadge}>YOUR CURRENT TRIAL</Text>
            )}
            {plan.highlight && !isTrialPlan && (
              <Text style={styles.popularBadge}>MOST POPULAR</Text>
            )}
            <Text style={styles.planName}>{plan.name}</Text>
            <Text style={styles.planPrice}>{plan.price}</Text>
            <Text style={styles.planDescription}>{plan.description}</Text>

            {plan.features.map((feature) => (
              <Text key={feature} style={styles.feature}>✓ {feature}</Text>
            ))}

            {plan.productId && plan.cta ? (
              <TouchableOpacity
                style={[styles.ctaBtn, plan.highlight && styles.ctaBtnHighlight]}
                onPress={() => handlePurchase(plan.productId!)}
                disabled={isCurrent}
                accessibilityLabel={getCtaLabel(plan.id, plan.cta)}
              >
                <Text style={[styles.ctaBtnText, plan.highlight && styles.ctaBtnTextHighlight]}>
                  {isCurrent ? 'Current plan' : getCtaLabel(plan.id, plan.cta)}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.freePlanNote}>
                <Text style={styles.freePlanNoteText}>
                  {isCurrent ? 'Your current plan' : 'Free forever'}
                </Text>
              </View>
            )}
          </View>
        )
      })}

      <TouchableOpacity onPress={handleRestore} style={styles.restoreBtn}>
        <Text style={styles.restoreBtnText}>Restore purchases</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
        <Text style={styles.closeBtnText}>Maybe later</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 20, paddingBottom: 60 },
  header: { fontSize: 26, fontWeight: '700', color: '#1a1a1a', textAlign: 'center', marginTop: 20, marginBottom: 8 },
  sub: { fontSize: 15, color: '#6b7280', textAlign: 'center', marginBottom: 28, lineHeight: 22 },

  planCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  planCardHighlight: { borderColor: '#0f766e', borderWidth: 2 },
  popularBadge: { alignSelf: 'flex-start', backgroundColor: '#f0fdf4', color: '#15803d', fontSize: 10, fontWeight: '700', letterSpacing: 0.8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 12 },
  trialBadge: { alignSelf: 'flex-start', backgroundColor: '#fef3c7', color: '#92400e', fontSize: 10, fontWeight: '700', letterSpacing: 0.8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 12 },
  planName: { fontSize: 20, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  planPrice: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 6 },
  planDescription: { fontSize: 13, color: '#9ca3af', marginBottom: 14 },
  feature: { fontSize: 14, color: '#374151', marginBottom: 6, lineHeight: 20 },

  ctaBtn: { marginTop: 16, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center', minHeight: 44 },
  ctaBtnHighlight: { backgroundColor: '#0f766e', borderColor: '#0f766e' },
  ctaBtnText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  ctaBtnTextHighlight: { color: '#fff' },

  freePlanNote: { marginTop: 16, alignItems: 'center' },
  freePlanNoteText: { fontSize: 13, color: '#9ca3af' },

  restoreBtn: { alignItems: 'center', padding: 14, marginTop: 8, minHeight: 44 },
  restoreBtnText: { fontSize: 14, color: '#6b7280' },
  closeBtn: { alignItems: 'center', padding: 14, minHeight: 44 },
  closeBtnText: { fontSize: 14, color: '#9ca3af' },
})
