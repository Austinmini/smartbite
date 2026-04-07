import React from 'react'
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import type { Reminder } from './ReminderCard'

interface Props {
  visible: boolean
  onClose: () => void
  onSave: (data: {
    itemName: string
    quantity: number
    unit: string
    frequencyDays: number
  }) => void
  reminder: Reminder | null
}

const FREQUENCY_PRESETS = [
  { label: 'Daily', days: 1 },
  { label: 'Every 3 days', days: 3 },
  { label: 'Weekly', days: 7 },
  { label: 'Every 2 weeks', days: 14 },
  { label: 'Monthly', days: 30 },
]

export function ReminderEditor({ visible, onClose, onSave, reminder }: Props) {
  const [name, setName] = React.useState('')
  const [quantity, setQuantity] = React.useState('')
  const [unit, setUnit] = React.useState('')
  const [frequencyDays, setFrequencyDays] = React.useState(7)

  React.useEffect(() => {
    if (reminder) {
      setName(reminder.itemName)
      setQuantity(String(reminder.quantity))
      setUnit(reminder.unit)
      setFrequencyDays(reminder.frequencyDays)
    } else {
      setName('')
      setQuantity('')
      setUnit('')
      setFrequencyDays(7)
    }
  }, [reminder, visible])

  function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) return
    const qty = parseFloat(quantity)
    onSave({
      itemName: trimmed,
      quantity: qty > 0 ? qty : 1,
      unit: unit.trim() || 'each',
      frequencyDays,
    })
  }

  if (!visible) return null

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{reminder ? 'Edit reminder' : 'Add a reminder'}</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>Item name</Text>
            <TextInput
              testID="reminder-name-input"
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. eggs, milk, olive oil"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Quantity</Text>
            <TextInput
              testID="reminder-quantity-input"
              style={styles.input}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="decimal-pad"
              placeholder="e.g. 12"
            />

            <Text style={styles.label}>Unit</Text>
            <TextInput
              testID="reminder-unit-input"
              style={styles.input}
              value={unit}
              onChangeText={setUnit}
              placeholder="each, gallon, oz, lb…"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Remind me every</Text>
            <View style={styles.presets}>
              {FREQUENCY_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.days}
                  style={[styles.preset, frequencyDays === preset.days && styles.presetSelected]}
                  onPress={() => setFrequencyDays(preset.days)}
                  testID={`freq-preset-${preset.days}`}
                >
                  <Text style={[styles.presetText, frequencyDays === preset.days && styles.presetTextSelected]}>
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              testID="reminder-save-btn"
              style={styles.saveBtn}
              onPress={handleSave}
            >
              <Text style={styles.saveBtnText}>{reminder ? 'Save changes' : 'Add reminder'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID="reminder-cancel-btn"
              style={styles.cancelBtn}
              onPress={onClose}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
    marginBottom: 16,
  },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  preset: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  presetSelected: { backgroundColor: '#dcfce7', borderColor: '#22c55e' },
  presetText: { fontSize: 13, color: '#4b5563' },
  presetTextSelected: { color: '#166534', fontWeight: '600' },
  saveBtn: {
    backgroundColor: '#22c55e',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 44,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelBtn: { alignItems: 'center', paddingVertical: 14, minHeight: 44 },
  cancelBtnText: { color: '#6b7280', fontSize: 14 },
})
