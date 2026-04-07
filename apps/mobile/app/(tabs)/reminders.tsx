import React from 'react'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { apiClient } from '../../lib/apiClient'
import { useAuthStore } from '../../stores/authStore'
import { ReminderCard } from '../../components/ReminderCard'
import { ReminderEditor } from '../../components/ReminderEditor'
import type { Reminder } from '../../components/ReminderCard'

interface ReminderSuggestion {
  itemName: string
  suggestedQuantity: number
  suggestedUnit: string
  suggestedFrequencyDays: number
  confidence: 'high' | 'medium' | 'low'
  reasoning: string
}

export default function RemindersScreen() {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const [reminders, setReminders] = React.useState<Reminder[]>([])
  const [suggestions, setSuggestions] = React.useState<ReminderSuggestion[]>([])
  const [loading, setLoading] = React.useState(true)
  const [editorVisible, setEditorVisible] = React.useState(false)
  const [editingReminder, setEditingReminder] = React.useState<Reminder | null>(null)

  const isPro = user?.tier === 'PRO'

  React.useEffect(() => {
    if (!token) return
    loadReminders()
    if (isPro) loadSuggestions()
  }, [token])

  async function loadReminders() {
    try {
      const data = await apiClient.get<{ reminders: Reminder[] }>('/reminders', token!)
      setReminders(data.reminders)
    } catch {
      // Silent — show empty state
    } finally {
      setLoading(false)
    }
  }

  async function loadSuggestions() {
    try {
      const data = await apiClient.get<{ suggestions: ReminderSuggestion[] }>(
        '/reminders/suggestions',
        token!
      )
      setSuggestions(data.suggestions)
    } catch {
      // Silent
    }
  }

  async function handleSave(data: {
    itemName: string
    quantity: number
    unit: string
    frequencyDays: number
  }) {
    try {
      if (editingReminder) {
        const updated = await apiClient.put<{ reminder: Reminder }>(
          `/reminders/${editingReminder.id}`,
          data,
          token!
        )
        setReminders((prev) => prev.map((r) => (r.id === editingReminder.id ? updated.reminder : r)))
      } else {
        const created = await apiClient.post<{ reminder: Reminder }>('/reminders', data, token!)
        setReminders((prev) => [...prev, created.reminder])
      }
      setEditorVisible(false)
      setEditingReminder(null)
    } catch (err: any) {
      Alert.alert('Could not save reminder', err.message ?? 'Please try again.')
    }
  }

  async function handleDelete(id: string) {
    Alert.alert('Delete reminder', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete(`/reminders/${id}`, token!)
            setReminders((prev) => prev.filter((r) => r.id !== id))
          } catch (err: any) {
            Alert.alert('Error', err.message ?? 'Could not delete reminder.')
          }
        },
      },
    ])
  }

  function openEditor(reminder?: Reminder) {
    setEditingReminder(reminder ?? null)
    setEditorVisible(true)
  }

  async function addSuggestion(suggestion: ReminderSuggestion) {
    await handleSave({
      itemName: suggestion.itemName,
      quantity: suggestion.suggestedQuantity,
      unit: suggestion.suggestedUnit,
      frequencyDays: suggestion.suggestedFrequencyDays,
    })
    setSuggestions((prev) => prev.filter((s) => s.itemName !== suggestion.itemName))
  }

  if (!isPro) {
    return (
      <View style={styles.gateContainer}>
        <Text style={styles.gateTitle}>Purchase reminders</Text>
        <Text style={styles.gateBody}>
          Set reminders for staples like eggs, milk, or olive oil. The app learns your habits
          and suggests the right quantity and frequency automatically.
        </Text>
        <Text style={styles.gateNote}>Available on Pro ($9.99/mo)</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Reminders</Text>
          <TouchableOpacity
            style={styles.addBtn}
            testID="add-reminder-btn"
            onPress={() => openEditor()}
          >
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#22c55e" style={styles.spinner} />
        ) : (
          <>
            {suggestions.length > 0 && (
              <View style={styles.suggestionsSection}>
                <Text style={styles.sectionTitle}>AI-suggested reminders</Text>
                <Text style={styles.sectionSubtitle}>
                  Based on your purchase history
                </Text>
                {suggestions.map((s) => (
                  <View key={s.itemName} style={styles.suggestionCard}>
                    <View style={styles.suggestionLeft}>
                      <Text style={styles.suggestionName}>{s.itemName}</Text>
                      <Text style={styles.suggestionMeta}>
                        {s.suggestedQuantity} {s.suggestedUnit} · every {s.suggestedFrequencyDays} days
                      </Text>
                      <Text style={styles.suggestionReasoning}>{s.reasoning}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.addSuggestionBtn}
                      onPress={() => addSuggestion(s)}
                      testID={`add-suggestion-${s.itemName}`}
                    >
                      <Text style={styles.addSuggestionText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {reminders.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No reminders yet</Text>
                <Text style={styles.emptyBody}>
                  Add reminders for staples like eggs, milk, or bread and never run out again.
                </Text>
                <TouchableOpacity style={styles.emptyBtn} onPress={() => openEditor()}>
                  <Text style={styles.emptyBtnText}>Add your first reminder</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.list}>
                <Text style={styles.sectionTitle}>Your reminders</Text>
                {reminders.map((reminder) => (
                  <ReminderCard
                    key={reminder.id}
                    reminder={reminder}
                    onEdit={openEditor}
                    onDelete={handleDelete}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <ReminderEditor
        visible={editorVisible}
        onClose={() => { setEditorVisible(false); setEditingReminder(null) }}
        onSave={handleSave}
        reminder={editingReminder}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingBottom: 48 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '700', color: '#111827' },
  addBtn: {
    backgroundColor: '#dcfce7',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 36,
  },
  addBtnText: { fontSize: 14, fontWeight: '700', color: '#16a34a' },
  spinner: { marginTop: 40 },
  suggestionsSection: { marginBottom: 28 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 4 },
  sectionSubtitle: { fontSize: 13, color: '#6b7280', marginBottom: 12 },
  suggestionCard: {
    backgroundColor: '#f5f3ff',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9d5ff',
  },
  suggestionLeft: { flex: 1, gap: 3 },
  suggestionName: { fontSize: 15, fontWeight: '700', color: '#111827', textTransform: 'capitalize' },
  suggestionMeta: { fontSize: 13, color: '#6b7280' },
  suggestionReasoning: { fontSize: 12, color: '#6d28d9', lineHeight: 17, marginTop: 2 },
  addSuggestionBtn: {
    backgroundColor: '#7c3aed',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 36,
  },
  addSuggestionText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  list: { gap: 10 },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151' },
  emptyBody: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
  emptyBtn: {
    backgroundColor: '#22c55e',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    minHeight: 44,
    marginTop: 8,
  },
  emptyBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  gateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 16 },
  gateTitle: { fontSize: 22, fontWeight: '700', color: '#111827', textAlign: 'center' },
  gateBody: { fontSize: 15, color: '#4b5563', textAlign: 'center', lineHeight: 22 },
  gateNote: { fontSize: 13, color: '#9ca3af', marginTop: 8 },
})
