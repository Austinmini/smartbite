import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export interface Reminder {
  id: string
  itemName: string
  quantity: number
  unit: string
  frequencyDays: number
  nextRemindAt: string
  active: boolean
  source: 'manual' | 'ai_suggested' | 'rule_suggested'
  reasoning: string | null
}

interface Props {
  reminder: Reminder
  onEdit: (reminder: Reminder) => void
  onDelete: (id: string) => void
}

function formatNextDate(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function ReminderCard({ reminder, onEdit, onDelete }: Props) {
  return (
    <View style={styles.card} testID={`reminder-card-${reminder.id}`}>
      <View style={styles.left}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{reminder.itemName}</Text>
          {reminder.source === 'ai_suggested' && (
            <View style={styles.aiBadge}>
              <Text style={styles.aiBadgeText}>AI</Text>
            </View>
          )}
          {!reminder.active && (
            <View style={styles.inactiveBadge} testID={`reminder-inactive-${reminder.id}`}>
              <Text style={styles.inactiveBadgeText}>Paused</Text>
            </View>
          )}
        </View>
        <Text style={styles.quantity}>{reminder.quantity} {reminder.unit}</Text>
        <View style={styles.metaRow}>
          <View style={styles.freqChip}>
            <Text style={styles.freqText}>Every {reminder.frequencyDays} days</Text>
          </View>
          <Text style={styles.nextDue}>Next: {formatNextDate(reminder.nextRemindAt)}</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          testID={`reminder-edit-${reminder.id}`}
          style={styles.actionBtn}
          onPress={() => onEdit(reminder)}
          accessibilityLabel={`Edit ${reminder.itemName} reminder`}
        >
          <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID={`reminder-delete-${reminder.id}`}
          style={styles.actionBtn}
          onPress={() => onDelete(reminder.id)}
          accessibilityLabel={`Delete ${reminder.itemName} reminder`}
        >
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
  },
  left: { flex: 1, gap: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name: { fontSize: 16, fontWeight: '700', color: '#111827' },
  aiBadge: {
    backgroundColor: '#ede9fe',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  aiBadgeText: { fontSize: 11, fontWeight: '700', color: '#7c3aed' },
  inactiveBadge: {
    backgroundColor: '#f3f4f6',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  inactiveBadgeText: { fontSize: 11, fontWeight: '600', color: '#6b7280' },
  quantity: { fontSize: 14, color: '#4b5563' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  freqChip: {
    backgroundColor: '#dcfce7',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  freqText: { fontSize: 12, fontWeight: '600', color: '#166534' },
  nextDue: { fontSize: 12, color: '#6b7280' },
  actions: { gap: 8, alignItems: 'flex-end' },
  actionBtn: { minHeight: 32, justifyContent: 'center', paddingHorizontal: 4 },
  editText: { fontSize: 13, fontWeight: '600', color: '#22c55e' },
  deleteText: { fontSize: 13, fontWeight: '600', color: '#ef4444' },
})
