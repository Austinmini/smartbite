import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { apiClient } from '@/lib/apiClient'
import { useAuthStore } from '@/stores/authStore'
import { useProfileStore } from '@/stores/profileStore'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  )
}

function PreferenceRow({ label, value, onEdit }: { label: string; value: string; onEdit?: () => void }) {
  return (
    <View style={styles.prefRow}>
      <View style={styles.prefInfo}>
        <Text style={styles.prefLabel}>{label}</Text>
        <Text style={styles.prefValue}>{value}</Text>
      </View>
      {onEdit && (
        <TouchableOpacity onPress={onEdit} style={styles.editBtn} accessibilityLabel={`Edit ${label}`}>
          <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

export default function ProfileScreen() {
  const router = useRouter()
  const { user, token, clearUser } = useAuthStore()
  const { weeklyBudget, preferredRetailers, dietaryGoals, allergies, cuisinePrefs, cookingTimeMax, servings, setOnboardingComplete } = useProfileStore()

  async function handleLogout() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.post('/auth/logout', {}, token ?? undefined)
          } catch { /* ignore errors */ }
          clearUser()
        },
      },
    ])
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.email}>{user?.email}</Text>
      <View style={styles.tierBadge}>
        <Text style={styles.tierText}>{user?.tier ?? 'FREE'}</Text>
      </View>

      <Section title="Shopping">
        <PreferenceRow
          label="Weekly budget"
          value={`$${weeklyBudget}`}
          onEdit={() => router.push('/(auth)/onboarding/budget')}
        />
        <PreferenceRow
          label="Preferred stores"
          value={preferredRetailers.length > 0 ? preferredRetailers.join(', ') : 'None selected'}
          onEdit={() => router.push('/(auth)/onboarding/location')}
        />
      </Section>

      <Section title="Dietary">
        <PreferenceRow
          label="Goals"
          value={dietaryGoals.length > 0 ? dietaryGoals.join(', ') : 'None set'}
          onEdit={() => router.push('/(auth)/onboarding/dietary')}
        />
        <PreferenceRow
          label="Allergies"
          value={allergies.length > 0 ? allergies.join(', ') : 'None'}
          onEdit={() => router.push('/(auth)/onboarding/dietary')}
        />
        {cuisinePrefs.length > 0 && (
          <PreferenceRow label="Cuisines" value={cuisinePrefs.join(', ')} />
        )}
        <PreferenceRow label="Max cook time" value={`${cookingTimeMax} min`} />
        <PreferenceRow label="Servings" value={String(servings)} />
      </Section>

      <Section title="Account">
        <PreferenceRow label="Subscription" value={user?.tier ?? 'Free'} />
      </Section>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 28, fontWeight: '700', color: '#1a1a1a', marginTop: 16 },
  email: { fontSize: 15, color: '#6b7280', marginTop: 4 },
  tierBadge: { alignSelf: 'flex-start', backgroundColor: '#f0fdf4', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8, marginBottom: 24 },
  tierText: { fontSize: 12, fontWeight: '700', color: '#15803d', letterSpacing: 0.5 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#9ca3af', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 },
  prefRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  prefInfo: { flex: 1 },
  prefLabel: { fontSize: 14, color: '#374151', fontWeight: '500' },
  prefValue: { fontSize: 14, color: '#6b7280', marginTop: 2, textTransform: 'capitalize' },
  editBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#f3f4f6', minHeight: 44, justifyContent: 'center' },
  editText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  logoutBtn: { marginTop: 8, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#ef4444', alignItems: 'center', minHeight: 44 },
  logoutText: { color: '#ef4444', fontSize: 16, fontWeight: '600' },
})
