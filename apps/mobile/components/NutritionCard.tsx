import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

interface Nutrition {
  calories: number
  protein: number
  carbs: number
  fat: number
}

interface Props {
  nutrition: Nutrition
}

export function NutritionCard({ nutrition }: Props) {
  return (
    <View style={styles.card} testID="nutrition-card">
      <Text style={styles.heading}>Nutrition</Text>
      <View style={styles.row}>
        <MacroItem label="Calories" value={String(nutrition.calories)} unit="" />
        <MacroItem label="Protein" value={`${nutrition.protein}g`} unit="" />
        <MacroItem label="Carbs" value={`${nutrition.carbs}g`} unit="" />
        <MacroItem label="Fat" value={`${nutrition.fat}g`} unit="" />
      </View>
      <Text style={styles.disclaimer}>Nutritional information is approximate.</Text>
    </View>
  )
}

function MacroItem({ label, value }: { label: string; value: string; unit: string }) {
  return (
    <View style={styles.macro}>
      <Text style={styles.macroValue}>{value}</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  heading: { fontSize: 15, fontWeight: '600', color: '#1a1a1a', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  macro: { alignItems: 'center', flex: 1 },
  macroValue: { fontSize: 18, fontWeight: '700', color: '#15803d' },
  macroLabel: { fontSize: 11, color: '#666', marginTop: 2 },
  disclaimer: { fontSize: 11, color: '#9ca3af', marginTop: 10, textAlign: 'center' },
})
