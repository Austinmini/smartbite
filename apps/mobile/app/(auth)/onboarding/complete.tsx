import { useEffect, useState } from 'react'
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { apiClient } from '@/lib/apiClient'
import { useAuthStore } from '@/stores/authStore'
import { useProfileStore } from '@/stores/profileStore'

export default function CompleteScreen() {
  const router = useRouter()
  const token = useAuthStore((s) => s.token)
  const { weeklyBudget, location, preferredRetailers, selectedStores, dietaryGoals, allergies, setOnboardingComplete } = useProfileStore()
  const [saving, setSaving] = useState(false)

  async function finishOnboarding() {
    setSaving(true)
    try {
      await apiClient.put(
        '/profile',
        {
          weeklyBudget,
          location: location ?? {},
          preferredRetailers,
          selectedStores,
          dietaryGoals,
          allergies,
        },
        token ?? undefined
      )
      setOnboardingComplete(true)
      // Root layout will automatically redirect to /(tabs) once onboardingComplete is true
    } catch (err: any) {
      Alert.alert('Error', 'Could not save your preferences. Please try again.')
      setSaving(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🎉</Text>
      <Text style={styles.title}>You're all set!</Text>
      <Text style={styles.subtitle}>Here's what we've got for you:</Text>

      <View style={styles.summary}>
        <SummaryRow label="Weekly budget" value={`$${weeklyBudget}`} />
        <SummaryRow label="Stores" value={selectedStores.length > 0 ? selectedStores.map((store) => store.name).join(', ') : '—'} />
        <SummaryRow label="Dietary goals" value={dietaryGoals.length > 0 ? dietaryGoals.join(', ') : 'None set'} />
        <SummaryRow label="Allergies" value={allergies.length > 0 ? allergies.join(', ') : 'None'} />
      </View>

      <View style={styles.spacer} />
      <TouchableOpacity style={styles.btn} onPress={finishOnboarding} disabled={saving} testID="continue-btn">
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Generate my first meal plan</Text>}
      </TouchableOpacity>
    </View>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24, paddingTop: 56 },
  emoji: { fontSize: 56, textAlign: 'center', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '700', color: '#1a1a1a', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 32 },
  summary: { backgroundColor: '#f9fafb', borderRadius: 14, padding: 20, gap: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  rowLabel: { fontSize: 14, color: '#6b7280', fontWeight: '500', width: 120 },
  rowValue: { fontSize: 14, color: '#1a1a1a', fontWeight: '600', flex: 1, textAlign: 'right', textTransform: 'capitalize' },
  spacer: { flex: 1 },
  btn: { backgroundColor: '#22c55e', padding: 14, borderRadius: 10, alignItems: 'center', minHeight: 44 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
