import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { useProfileStore } from '@/stores/profileStore'

const DIETARY_GOALS = [
  { key: 'high-protein', label: 'High protein', emoji: '💪' },
  { key: 'low-carb', label: 'Low carb', emoji: '🥩' },
  { key: 'vegan', label: 'Vegan', emoji: '🌱' },
  { key: 'vegetarian', label: 'Vegetarian', emoji: '🥦' },
  { key: 'low-calorie', label: 'Low calorie', emoji: '🍃' },
  { key: 'balanced', label: 'Balanced', emoji: '⚖️' },
  { key: 'mediterranean', label: 'Mediterranean', emoji: '🫒' },
  { key: 'keto', label: 'Keto', emoji: '🥑' },
]

const ALLERGIES = [
  { key: 'gluten', label: 'Gluten', emoji: '🌾' },
  { key: 'dairy', label: 'Dairy', emoji: '🥛' },
  { key: 'nuts', label: 'Nuts', emoji: '🥜' },
  { key: 'eggs', label: 'Eggs', emoji: '🥚' },
  { key: 'shellfish', label: 'Shellfish', emoji: '🦐' },
  { key: 'soy', label: 'Soy', emoji: '🫘' },
]

function ChipGrid({ items, selected, onToggle }: {
  items: { key: string; label: string; emoji: string }[]
  selected: string[]
  onToggle: (key: string) => void
}) {
  return (
    <View style={styles.chipGrid}>
      {items.map((item) => {
        const active = selected.includes(item.key)
        return (
          <TouchableOpacity
            key={item.key}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => {
              const next = active
                ? selected.filter((k) => k !== item.key)
                : [...selected, item.key]
              onToggle(item.key)
            }}
            accessibilityLabel={item.label}
          >
            <Text style={styles.chipEmoji}>{item.emoji}</Text>
            <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{item.label}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

export default function DietaryScreen() {
  const router = useRouter()
  const { dietaryGoals, allergies, setDietaryGoals, setAllergies } = useProfileStore()

  function toggleGoal(key: string) {
    if (dietaryGoals.includes(key)) {
      setDietaryGoals(dietaryGoals.filter((k) => k !== key))
    } else {
      setDietaryGoals([...dietaryGoals, key])
    }
  }

  function toggleAllergy(key: string) {
    if (allergies.includes(key)) {
      setAllergies(allergies.filter((k) => k !== key))
    } else {
      setAllergies([...allergies, key])
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.step}>Step 3 of 4</Text>
      <Text style={styles.title}>Dietary preferences</Text>
      <Text style={styles.subtitle}>Help us personalise your meal plan. All optional.</Text>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
        <Text style={styles.sectionLabel}>Dietary goals</Text>
        <ChipGrid items={DIETARY_GOALS} selected={dietaryGoals} onToggle={toggleGoal} />

        <Text style={styles.sectionLabel}>Allergies & restrictions</Text>
        <ChipGrid items={ALLERGIES} selected={allergies} onToggle={toggleAllergy} />

        <View style={{ height: 100 }} />
      </ScrollView>
      <TouchableOpacity style={styles.btn} onPress={() => router.push('/(auth)/onboarding/complete')} testID="continue-btn">
        <Text style={styles.btnText}>Continue</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24, paddingTop: 56 },
  step: { fontSize: 13, color: '#9ca3af', fontWeight: '500', marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 16 },
  scroll: { flex: 1 },
  sectionLabel: { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 12, marginTop: 8 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 24, borderWidth: 1, borderColor: '#e5e7eb', minHeight: 44, gap: 6 },
  chipActive: { backgroundColor: '#f0fdf4', borderColor: '#22c55e' },
  chipEmoji: { fontSize: 16 },
  chipLabel: { fontSize: 14, color: '#444', fontWeight: '500' },
  chipLabelActive: { color: '#15803d' },
  btn: { backgroundColor: '#22c55e', padding: 14, borderRadius: 10, alignItems: 'center', minHeight: 44, position: 'absolute', bottom: 32, left: 24, right: 24 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
