import { StyleSheet, Text, View, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useProfileStore } from '@/stores/profileStore'

export default function ServingsScreen() {
  const router = useRouter()
  const { servings, cookingTimeMax, setServings, setCookingTimeMax } = useProfileStore()

  return (
    <View style={styles.container}>
      <Text style={styles.step}>Step 2 of 5</Text>
      <Text style={styles.title}>Serving size & cook time</Text>
      <Text style={styles.subtitle}>This helps us suggest meal plans and budget targets that fit your household.</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Servings per meal</Text>
        <View style={styles.controls}>
          <TouchableOpacity style={styles.btnCircle} onPress={() => setServings(Math.max(1, servings - 1))}>
            <Text style={styles.btnText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.value}>{servings}</Text>
          <TouchableOpacity style={styles.btnCircle} onPress={() => setServings(Math.min(12, servings + 1))}>
            <Text style={styles.btnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Max cook time</Text>
        <View style={styles.controls}>
          <TouchableOpacity style={styles.btnCircle} onPress={() => setCookingTimeMax(Math.max(10, cookingTimeMax - 5))}>
            <Text style={styles.btnText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.value}>{cookingTimeMax} min</Text>
          <TouchableOpacity style={styles.btnCircle} onPress={() => setCookingTimeMax(Math.min(180, cookingTimeMax + 5))}>
            <Text style={styles.btnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.spacer} />
      <TouchableOpacity style={styles.continueBtn} onPress={() => router.push('/(auth)/onboarding/budget')} testID="continue-btn">
        <Text style={styles.continueText}>Continue</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24, paddingTop: 56 },
  step: { fontSize: 13, color: '#9ca3af', fontWeight: '500', marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 24 },
  row: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: { fontSize: 16, color: '#111827', fontWeight: '600' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  btnCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { fontSize: 20, color: '#111827', lineHeight: 20 },
  value: { minWidth: 72, textAlign: 'center', fontSize: 16, color: '#374151', fontWeight: '600' },
  spacer: { flex: 1 },
  continueBtn: { backgroundColor: '#22c55e', padding: 14, borderRadius: 10, alignItems: 'center', minHeight: 44 },
  continueText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
