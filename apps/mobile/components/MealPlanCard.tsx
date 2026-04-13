import React, { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native'
import type { MealPlan, PlanMeal } from '../stores/mealPlanStore'
import { RecipeCard } from './RecipeCard'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const BASE_ESTIMATE_CONFIDENCE = 35

interface Props {
  plan: MealPlan
  onMealPress: (meal: PlanMeal) => void
}

export function MealPlanCard({ plan, onMealPress }: Props) {
  const [selectedDay, setSelectedDay] = useState(0)

  const mealsForDay = plan.meals.filter((m) => m.dayOfWeek === selectedDay)
  const pricedMealsCount = plan.meals.filter((meal) => meal.bestStore && meal.bestStore.trim().length > 0).length
  const coveragePct = plan.meals.length > 0
    ? Math.round((pricedMealsCount / plan.meals.length) * 100)
    : 0
  const pricingConfidencePct = Math.round(
    BASE_ESTIMATE_CONFIDENCE + ((100 - BASE_ESTIMATE_CONFIDENCE) * coveragePct) / 100
  )

  return (
    <View style={styles.container} testID="meal-plan-card">
      <View style={styles.header}>
        <Text style={styles.title}>This week</Text>
        <Text style={styles.cost}>~${plan.totalEstCost.toFixed(2)} est.</Text>
      </View>
      <Text style={styles.confidence}>
        Crowd-sourced pricing confidence: {pricingConfidencePct}%
      </Text>
      <Text style={styles.note}>
        Estimates improve as people in your community scan more prices.
      </Text>

      {/* Day tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabs}
        contentContainerStyle={styles.tabsContent}
      >
        {DAY_LABELS.map((label, index) => (
          <TouchableOpacity
            key={label}
            testID={`day-tab-${index}`}
            style={[styles.tab, selectedDay === index && styles.tabActive]}
            onPress={() => setSelectedDay(index)}
          >
            <Text style={[styles.tabText, selectedDay === index && styles.tabTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Meals for selected day */}
      <View style={styles.meals}>
        {mealsForDay.length === 0 ? (
          <Text style={styles.noMeals}>No meals planned for this day.</Text>
        ) : (
          mealsForDay.map((meal) => (
            <RecipeCard key={meal.id} meal={meal} onPress={onMealPress} />
          ))
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  cost: { fontSize: 15, fontWeight: '600', color: '#22c55e' },
  confidence: { fontSize: 12, color: '#166534', fontWeight: '600', marginBottom: 2 },
  note: { fontSize: 12, color: '#6b7280', marginBottom: 10 },
  tabs: { marginBottom: 12 },
  tabsContent: { gap: 8 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    minHeight: 44,
    justifyContent: 'center',
  },
  tabActive: { backgroundColor: '#22c55e' },
  tabText: { fontSize: 13, fontWeight: '500', color: '#6b7280' },
  tabTextActive: { color: '#fff' },
  meals: { gap: 8 },
  noMeals: { color: '#9ca3af', textAlign: 'center', paddingVertical: 16, fontSize: 14 },
})
