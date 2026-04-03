import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { useMealPlanStore } from '../../stores/mealPlanStore'
import { useAuthStore } from '../../stores/authStore'
import { MealPlanCard } from '../../components/MealPlanCard'
import type { PlanMeal } from '../../stores/mealPlanStore'

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'

export default function HomeScreen() {
  const router = useRouter()
  const { plan, isGenerating, error, setPlan, setGenerating, setError } = useMealPlanStore()
  const token = useAuthStore((s) => s.token)

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
      })
      if (res.status === 429) {
        const body = await res.json()
        Alert.alert('Plan limit reached', body.error)
        return
      }
      if (!res.ok) throw new Error('Failed to generate plan')
      const body = await res.json()
      setPlan(body.plan)
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
      <Text style={styles.title}>SmartBite</Text>
      <Text style={styles.subtitle}>Your weekly meal plan</Text>

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
})
