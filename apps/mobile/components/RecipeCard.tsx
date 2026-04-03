import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import type { PlanMeal } from '../stores/mealPlanStore'

interface Props {
  meal: PlanMeal
  onPress: (meal: PlanMeal) => void
}

export function RecipeCard({ meal, onPress }: Props) {
  return (
    <TouchableOpacity
      style={styles.card}
      testID={`recipe-card-${meal.id}`}
      onPress={() => onPress(meal)}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <Text style={styles.mealType}>{meal.mealType}</Text>
        <Text style={styles.cost}>~${meal.estCost.toFixed(2)}</Text>
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {meal.recipe.title}
      </Text>
      <View style={styles.meta}>
        <Text style={styles.metaText}>{meal.recipe.readyInMinutes} min</Text>
        {meal.recipe.tags.slice(0, 2).map((tag) => (
          <View key={tag} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    minHeight: 44,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  mealType: { fontSize: 11, fontWeight: '600', color: '#22c55e', letterSpacing: 0.5 },
  cost: { fontSize: 13, fontWeight: '600', color: '#1a1a1a' },
  title: { fontSize: 15, fontWeight: '600', color: '#1a1a1a', marginBottom: 8 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { fontSize: 12, color: '#666' },
  tag: { backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  tagText: { fontSize: 11, color: '#16a34a' },
})
