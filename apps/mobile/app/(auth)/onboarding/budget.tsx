import { useState } from 'react'
import { StyleSheet, Text, View, TextInput, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useProfileStore } from '@/stores/profileStore'

const PRESETS = [50, 75, 100, 150, 200]

export default function BudgetScreen() {
  const router = useRouter()
  const { weeklyBudget, setWeeklyBudget } = useProfileStore()
  const [input, setInput] = useState(weeklyBudget > 0 ? String(weeklyBudget) : '')

  function selectPreset(amount: number) {
    setInput(String(amount))
    setWeeklyBudget(amount)
  }

  function handleInputChange(text: string) {
    setInput(text.replace(/[^0-9]/g, ''))
    const n = parseInt(text, 10)
    if (!isNaN(n) && n > 0) setWeeklyBudget(n)
  }

  const budget = parseInt(input, 10) || 0
  const valid = budget >= 20 && budget <= 1000

  return (
    <View style={styles.container}>
      <Text style={styles.step}>Step 2 of 4</Text>
      <Text style={styles.title}>Weekly food budget</Text>
      <Text style={styles.subtitle}>How much do you want to spend on groceries per week?</Text>

      <View style={styles.inputRow}>
        <Text style={styles.dollar}>$</Text>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={handleInputChange}
          keyboardType="number-pad"
          placeholder="100"
          maxLength={4}
          testID="budget-input"
        />
        <Text style={styles.perWeek}>/week</Text>
      </View>

      <View style={styles.presets}>
        {PRESETS.map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.preset, budget === p && styles.presetSelected]}
            onPress={() => selectPreset(p)}
          >
            <Text style={[styles.presetText, budget === p && styles.presetTextSelected]}>${p}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {input.length > 0 && !valid && (
        <Text style={styles.hint}>Enter an amount between $20 and $1,000</Text>
      )}

      <View style={styles.spacer} />
      <TouchableOpacity
        style={[styles.btn, !valid && styles.btnDisabled]}
        onPress={() => router.push('/(auth)/onboarding/dietary')}
        disabled={!valid}
        testID="continue-btn"
      >
        <Text style={styles.btnText}>Continue</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24, paddingTop: 56 },
  step: { fontSize: 13, color: '#9ca3af', fontWeight: '500', marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 32 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: '#22c55e', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 20 },
  dollar: { fontSize: 28, fontWeight: '700', color: '#22c55e', marginRight: 4 },
  input: { flex: 1, fontSize: 32, fontWeight: '700', color: '#1a1a1a' },
  perWeek: { fontSize: 15, color: '#9ca3af', alignSelf: 'flex-end', marginBottom: 4 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  preset: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb', minHeight: 44, justifyContent: 'center' },
  presetSelected: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  presetText: { fontSize: 15, color: '#444', fontWeight: '500' },
  presetTextSelected: { color: '#fff' },
  hint: { fontSize: 13, color: '#ef4444' },
  spacer: { flex: 1 },
  btn: { backgroundColor: '#22c55e', padding: 14, borderRadius: 10, alignItems: 'center', minHeight: 44 },
  btnDisabled: { backgroundColor: '#d1d5db' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
