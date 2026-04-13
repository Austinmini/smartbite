import React from 'react'
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { useMealPlanStore } from '../../stores/mealPlanStore'
import { useAuthStore } from '../../stores/authStore'
import { useProfileStore } from '../../stores/profileStore'
import { MealPlanCard } from '../../components/MealPlanCard'
import { OnboardingChecklist } from '../../components/OnboardingChecklist'
import { TipBanner } from '../../components/TipBanner'
import { AnnouncementBanner } from '../../components/AnnouncementBanner'
import { apiClient } from '../../lib/apiClient'
import { getApiBaseUrl } from '../../lib/apiBaseUrl'
import { trackEvent } from '@/lib/analytics'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { PlanMeal } from '../../stores/mealPlanStore'
import type { Announcement } from '../../components/AnnouncementBanner'
import type { ChecklistActions } from '../../components/OnboardingChecklist'

const API_BASE = getApiBaseUrl()

const CONTEXTUAL_TIPS = [
  { id: 'tip-scan', text: 'Scan a barcode in the shopping list to report prices and earn Bites.' },
  { id: 'tip-favourites', text: 'Heart a recipe to save it. Your favourites improve future meal plans.' },
  { id: 'tip-pantry', text: 'Mark a recipe as cooked and the app will deduct ingredients from your pantry automatically.' },
  { id: 'tip-reminders', text: 'Set reminders for staples like eggs or milk in the Reminders screen.' },
  { id: 'tip-split', text: 'The 2-store split view shows you when shopping at two stores saves $3 or more.' },
  { id: 'tip-alerts', text: 'Set a price alert on any recipe and get notified when the cost drops.' },
  { id: 'tip-budget', text: 'Update your weekly budget in Profile to keep meal plans within your target.' },
]

export default function HomeScreen() {
  const router = useRouter()
  const { plan, isGenerating, error, setPlan, clearPlan, setGenerating, setError } = useMealPlanStore()
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const weeklyBudget = useProfileStore((s) => s.weeklyBudget)

  const [announcements, setAnnouncements] = React.useState<Announcement[]>([])
  const [dismissedAnnouncements, setDismissedAnnouncements] = React.useState<string[]>([])
  const [showStartupTip, setShowStartupTip] = React.useState(true)
  const [completedActions, setCompletedActions] = React.useState<ChecklistActions>({
    profileComplete: false,
    firstPlanGenerated: false,
    firstRecipeCooked: false,
    firstScan: false,
    firstPurchase: false,
  })
  const [calibration, setCalibration] = React.useState<{
    complete: boolean
    progressCount: number
    targetCount: number
    missingStaples: string[]
  } | null>(null)

  // Load dismissed state from AsyncStorage
  React.useEffect(() => {
    async function loadDismissed() {
      try {
        const annRaw = await AsyncStorage.getItem('dismissed_announcements')
        if (annRaw) setDismissedAnnouncements(JSON.parse(annRaw))
      } catch {}
    }
    loadDismissed()
  }, [])

  // Load announcements from API
  React.useEffect(() => {
    if (!token) return
    apiClient.get<{ announcements: Announcement[] }>('/announcements', token)
      .then((data) => setAnnouncements(data.announcements ?? []))
      .catch(() => {})
  }, [token])

  React.useEffect(() => {
    if (!token) return
    apiClient.get<{ complete: boolean; progressCount: number; targetCount: number; missingStaples: string[] }>(
      '/prices/calibration-status',
      token
    )
      .then((data) => setCalibration(data))
      .catch(() => {})
  }, [token])

  async function loadChecklistStatus() {
    if (!token) return

    apiClient.get<{ completedActions: string[] }>('/profile/checklist', token)
      .then((data) => {
        const actions = data.completedActions ?? []
        setCompletedActions({
          profileComplete: actions.includes('profile_complete'),
          firstPlanGenerated: actions.includes('first_plan_generated') || !!plan,
          firstRecipeCooked: actions.includes('first_recipe_cooked'),
          firstScan: actions.includes('first_scan'),
          firstPurchase: actions.includes('first_purchase'),
        })
      })
      .catch(() => {})
  }

  // Load onboarding checklist status from profile
  React.useEffect(() => {
    loadChecklistStatus()
  }, [token])

  useFocusEffect(
    React.useCallback(() => {
      loadChecklistStatus()
    }, [token, plan])
  )

  async function dismissAnnouncement(id: string) {
    const updated = [...dismissedAnnouncements, id]
    setDismissedAnnouncements(updated)
    await AsyncStorage.setItem('dismissed_announcements', JSON.stringify(updated))
  }

  async function dismissTip(_tipId: string) {
    setShowStartupTip(false)
  }

  const visibleAnnouncements = announcements.filter((a) => !dismissedAnnouncements.includes(a.id))
  const nextTip = showStartupTip ? CONTEXTUAL_TIPS[0] : null
  const pricedMealsCount = plan?.meals.filter((meal) => meal.bestStore && meal.bestStore.trim().length > 0).length ?? 0
  const coveragePct = plan && plan.meals.length > 0 ? Math.round((pricedMealsCount / plan.meals.length) * 100) : 0
  const confidencePct = Math.round(35 + ((100 - 35) * coveragePct) / 100)
  const uncertaintyFactor = (100 - confidencePct) / 100
  const projectedLow = plan ? Math.max(0, plan.totalEstCost * (1 - uncertaintyFactor * 0.2)) : 0
  const projectedHigh = plan ? plan.totalEstCost * (1 + uncertaintyFactor * 0.35) : 0
  const budgetRisk = !plan
    ? null
    : projectedHigh > weeklyBudget
      ? 'HIGH'
      : plan.totalEstCost > weeklyBudget
        ? 'MEDIUM'
        : 'LOW'

  // Sync plan from server on mount — ensures the local store always reflects the
  // current user's plan, not a stale plan cached from a previous session/account.
  React.useEffect(() => {
    async function syncPlan() {
      try {
        const res = await fetch(`${API_BASE}/plans/current`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.status === 204) {
          clearPlan()
        } else if (res.ok) {
          const body = await res.json()
          setPlan(body.plan)
        }
      } catch {
        // Network error — keep showing the cached plan rather than flashing empty state
      }
    }
    if (token) syncPlan()
  }, [token])

  async function generatePlan() {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/plans/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      })
      if (res.status === 429) {
        const body = await res.json()
        Alert.alert('Plan limit reached', body.error)
        return
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Failed to generate plan')
      }
      const body = await res.json()
      setPlan(body.plan)

      // Track meal plan generation event
      const tier = useAuthStore.getState().tier
      trackEvent({
        name: 'meal_plan_generated',
        properties: {
          tier,
          days: 7,
          personalized: tier !== 'FREE'
        }
      })

      await loadChecklistStatus()
    } catch (e: any) {
      setError(e.message ?? 'Plan generation temporarily unavailable. Try again in a few minutes.')
    } finally {
      setGenerating(false)
    }
  }

  function handleMealPress(meal: PlanMeal) {
    router.push(`/recipe/${meal.id}`)
  }

  return (
    <ScrollView style={styles.container} testID="home-screen" contentContainerStyle={styles.content}>
      {/* Announcements */}
      {visibleAnnouncements.map((ann) => (
        <AnnouncementBanner key={ann.id} announcement={ann} onDismiss={dismissAnnouncement} />
      ))}

      <Text style={styles.title}>SavvySpoon</Text>
      <Text style={styles.subtitle}>Your weekly meal plan</Text>

      {/* Onboarding checklist — auto-hides when all done */}
      <OnboardingChecklist completedActions={completedActions} />

      {/* Contextual tip banner */}
      {nextTip && (
        <TipBanner tipId={nextTip.id} text={nextTip.text} onDismiss={dismissTip} />
      )}

      {calibration && !calibration.complete ? (
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>
            Calibrate your store: {calibration.progressCount}/{calibration.targetCount} scans
          </Text>
          <Text style={styles.infoBody}>
            Scan 5 staples to improve local estimate accuracy quickly.
            {calibration.missingStaples.length > 0
              ? ` Try: ${calibration.missingStaples.join(', ')}.`
              : ''}
          </Text>
          <TouchableOpacity style={styles.infoBtn} onPress={() => router.push('/scanner')}>
            <Text style={styles.infoBtnText}>Start scanning staples</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {plan ? (
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>
            Weekly budget guardrail ({budgetRisk ?? 'LOW'} risk)
          </Text>
          <Text style={styles.infoBody}>
            Projected spend range: ${projectedLow.toFixed(0)} - ${projectedHigh.toFixed(0)} vs ${weeklyBudget.toFixed(0)} budget.
            {budgetRisk === 'HIGH'
              ? ' Scan more prices to tighten estimates and avoid overspending.'
              : ' Keep scanning to improve confidence.'}
          </Text>
        </View>
      ) : null}

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {plan ? (
        <MealPlanCard plan={plan} onMealPress={handleMealPress} />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No plan yet</Text>
          <Text style={styles.emptyBody}>
            Generate a personalised 7-day meal plan based on your budget and preferences.
          </Text>
          {isGenerating ? (
            <View style={styles.loadingBox} testID="generating-spinner">
              <ActivityIndicator size="large" color="#22c55e" />
              <Text style={styles.loadingText}>Generating your plan…</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.cta}
              testID="generate-plan-btn"
              onPress={generatePlan}
            >
              <Text style={styles.ctaText}>Generate my meal plan</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 28, fontWeight: '700', color: '#1a1a1a', marginTop: 16 },
  subtitle: { fontSize: 16, color: '#666', marginTop: 4, marginBottom: 20 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 80 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#1a1a1a' },
  emptyBody: { fontSize: 15, color: '#666', textAlign: 'center', lineHeight: 22 },
  cta: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
    minHeight: 44,
  },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  loadingBox: { alignItems: 'center', gap: 12, marginTop: 8 },
  loadingText: { fontSize: 14, color: '#666' },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: { color: '#dc2626', fontSize: 14 },
  infoCard: {
    backgroundColor: '#ecfeff',
    borderColor: '#a5f3fc',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#0f766e', marginBottom: 4 },
  infoBody: { fontSize: 13, color: '#155e75', lineHeight: 18 },
  infoBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#0f766e',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  infoBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
})
