import { StyleSheet, Text, View, TouchableOpacity } from 'react-native'

export default function HomeScreen() {
  return (
    <View style={styles.container} testID="home-screen">
      <Text style={styles.title}>SmartBite</Text>
      <Text style={styles.subtitle}>Your weekly meal plan</Text>
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>No plan yet</Text>
        <Text style={styles.emptyBody}>Generate a personalised 7-day meal plan based on your budget and preferences.</Text>
        <TouchableOpacity style={styles.cta} testID="generate-plan-btn">
          <Text style={styles.ctaText}>Generate my meal plan</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24 },
  title: { fontSize: 28, fontWeight: '700', color: '#1a1a1a', marginTop: 16 },
  subtitle: { fontSize: 16, color: '#666', marginTop: 4 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#1a1a1a' },
  emptyBody: { fontSize: 15, color: '#666', textAlign: 'center', lineHeight: 22 },
  cta: { backgroundColor: '#22c55e', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12, marginTop: 8, minHeight: 44 },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
