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

export type FeedbackType = 'BUG' | 'FEATURE_REQUEST' | 'PRICE_ISSUE' | 'GENERAL'

interface Props {
  visible: boolean
  onClose: () => void
  onSubmit: (payload: { type: FeedbackType; subject?: string; body: string }) => void
  initialType?: FeedbackType
  initialSubject?: string
  initialBody?: string
}

const OPTIONS: Array<{ type: FeedbackType; label: string }> = [
  { type: 'BUG', label: 'Bug' },
  { type: 'FEATURE_REQUEST', label: 'Feature request' },
  { type: 'PRICE_ISSUE', label: 'Price issue' },
  { type: 'GENERAL', label: 'General' },
]

export function FeedbackSheet({
  visible,
  onClose,
  onSubmit,
  initialType = 'GENERAL',
  initialSubject = '',
  initialBody = '',
}: Props) {
  const [type, setType] = React.useState<FeedbackType>(initialType)
  const [subject, setSubject] = React.useState(initialSubject)
  const [body, setBody] = React.useState(initialBody)

  React.useEffect(() => {
    if (!visible) return
    setType(initialType)
    setSubject(initialSubject)
    setBody(initialBody)
  }, [visible, initialBody, initialSubject, initialType])

  function handleSubmit() {
    if (!body.trim()) return
    onSubmit({
      type,
      ...(subject.trim() ? { subject: subject.trim() } : {}),
      body: body.trim(),
    })
  }

  if (!visible) return null

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Send feedback</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>Type</Text>
            <View style={styles.optionsRow}>
              {OPTIONS.map((option) => {
                const selected = option.type === type
                return (
                  <TouchableOpacity
                    key={option.type}
                    testID={`feedback-type-${option.type}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[styles.typeChip, selected && styles.typeChipSelected]}
                    onPress={() => setType(option.type)}
                  >
                    <Text style={[styles.typeChipText, selected && styles.typeChipTextSelected]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            <Text style={styles.label}>Subject</Text>
            <TextInput
              testID="feedback-subject-input"
              style={styles.input}
              value={subject}
              onChangeText={setSubject}
              placeholder="Short summary"
            />

            <Text style={styles.label}>Details</Text>
            <TextInput
              testID="feedback-body-input"
              style={[styles.input, styles.bodyInput]}
              value={body}
              onChangeText={setBody}
              placeholder="Tell us what happened or what you'd like to see."
              multiline
              textAlignVertical="top"
            />

            <TouchableOpacity testID="feedback-submit-btn" style={styles.submitBtn} onPress={handleSubmit}>
              <Text style={styles.submitText}>Submit</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.35)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
    maxHeight: '90%',
  },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8, textTransform: 'uppercase' },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  typeChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 40,
    justifyContent: 'center',
  },
  typeChipSelected: {
    borderColor: '#0f766e',
    backgroundColor: '#ccfbf1',
  },
  typeChipText: { fontSize: 13, color: '#334155', fontWeight: '600' },
  typeChipTextSelected: { color: '#115e59' },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0f172a',
    marginBottom: 18,
  },
  bodyInput: {
    minHeight: 140,
  },
  submitBtn: {
    borderRadius: 14,
    backgroundColor: '#0f766e',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { alignItems: 'center', justifyContent: 'center', minHeight: 44, marginTop: 8 },
  cancelText: { color: '#64748b', fontSize: 14, fontWeight: '600' },
})
