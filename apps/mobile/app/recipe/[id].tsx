import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMealPlanStore } from '../../stores/mealPlanStore'
import { useAuthStore } from '../../stores/authStore'
import { NutritionCard } from '../../components/NutritionCard'

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const plan = useMealPlanStore((s) => s.plan)
  const token = useAuthStore((s) => s.token)
  const [regenerating, setRegenerating] = React.useState(false)

  // Find meal by id
  const meal = plan?.meals.find((m) => m.id === id)

  async function handleRegenerate() {
    if (!meal || !plan) return
    setRegenerating(true)
    try {
      const res = await fetch(`${API_BASE}/plans/${plan.id}/regenerate-meal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mealId: meal.id }),
      })
      if (!res.ok) throw new Error('Failed to regenerate meal')
      const body = await res.json()
      // Update meal in plan
      const updatedPlan = {
        ...plan,
        meals: plan.meals.map((m) => (m.id === meal.id ? { ...m, ...body.meal } : m)),
      }
      useMealPlanStore.getState().setPlan(updatedPlan)
      router.replace(`/recipe/${meal.id}`)
    } catch {
      Alert.alert('Error', 'Could not regenerate this meal. Please try again.')
    } finally {
      setRegenerating(false)
    }
  }

  if (!meal) {
    return (
      <View style={styles.notFound} testID="recipe-detail-screen">
        <Text style={styles.notFoundText}>Meal not found.</Text>
      </View>
    )
  }

  const { recipe } = meal

  return (
    <ScrollView style={styles.container} testID="recipe-detail-screen">
      {/* Header */}
      <View style={styles.hero}>
        <Text style={styles.mealType}>{meal.mealType}</Text>
        <Text style={styles.title}>{recipe.title}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaItem}>{recipe.readyInMinutes} min</Text>
          <Text style={styles.metaItem}>{recipe.servings} servings</Text>
          <Text style={styles.metaItem}>~${meal.estCost.toFixed(2)}/serving</Text>
        </View>
      </View>

      {/* Nutrition */}
      <View style={styles.section}>
        <NutritionCard nutrition={recipe.nutrition} />
      </View>

      {/* Ingredients */}
      <View style={styles.section} testID="ingredients-list">
        <Text style={styles.sectionTitle}>Ingredients</Text>
        {recipe.ingredients.map((ing, i) => (
          <View key={i} style={styles.ingredientRow}>
            <Text style={styles.ingredientDot}>•</Text>
            <Text style={styles.ingredientText}>
              {ing.amount} {ing.unit} {ing.name}
            </Text>
          </View>
        ))}
      </View>

      {/* Instructions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Instructions</Text>
        {recipe.instructions.map((step) => (
          <View key={step.step} style={styles.stepRow}>
            <Text style={styles.stepNumber}>{step.step}</Text>
            <Text style={styles.stepText}>{step.text}</Text>
          </View>
        ))}
      </View>

      {/* Regenerate */}
      <View style={styles.section}>
        {regenerating ? (
          <ActivityIndicator size="small" color="#22c55e" />
        ) : (
          <TouchableOpacity
            style={styles.regenerateBtn}
            testID="regenerate-meal-btn"
            onPress={handleRegenerate}
          >
            <Text style={styles.regenerateBtnText}>Regenerate this meal</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.disclaimer}>
        Nutritional information is approximate. Consult a healthcare provider for dietary advice.
      </Text>
    </ScrollView>
  )
}

// React import needed for useState
import React from 'react'

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  notFound: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  notFoundText: { fontSize: 16, color: '#666' },
  hero: { padding: 24, paddingBottom: 16, backgroundColor: '#f0fdf4' },
  mealType: { fontSize: 11, fontWeight: '600', color: '#22c55e', letterSpacing: 0.5, marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  metaRow: { flexDirection: 'row', gap: 16 },
  metaItem: { fontSize: 13, color: '#555' },
  section: { paddingHorizontal: 24, paddingVertical: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: '#1a1a1a', marginBottom: 10 },
  ingredientRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  ingredientDot: { color: '#22c55e', fontSize: 16 },
  ingredientText: { fontSize: 14, color: '#333', flex: 1 },
  stepRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#22c55e',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 12,
    fontWeight: '700',
  },
  stepText: { fontSize: 14, color: '#333', flex: 1, lineHeight: 20 },
  regenerateBtn: {
    borderWidth: 1,
    borderColor: '#22c55e',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    minHeight: 44,
  },
  regenerateBtnText: { color: '#22c55e', fontSize: 14, fontWeight: '600' },
  disclaimer: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
    paddingHorizontal: 24,
    paddingBottom: 32,
    lineHeight: 16,
  },
})
