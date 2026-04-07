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
import type { SavedFavourite } from '../stores/savedRecipesStore'

interface Props {
  visible: boolean
  favourite: SavedFavourite | null
  onClose: () => void
  onSave: (updates: { userRating: number | null; notes: string }) => void
}

export function SavedRecipeEditor({ visible, favourite, onClose, onSave }: Props) {
  const [userRating, setUserRating] = React.useState<number | null>(null)
  const [notes, setNotes] = React.useState('')

  React.useEffect(() => {
    if (!visible || !favourite) return
    setUserRating(favourite.userRating)
    setNotes(favourite.notes)
  }, [visible, favourite])

  if (!visible || !favourite) return null

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{favourite.recipe.title}</Text>
          <Text style={styles.label}>Rating</Text>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((rating) => {
              const selected = (userRating ?? 0) >= rating
              return (
                <TouchableOpacity
                  key={rating}
                  style={styles.starButton}
                  onPress={() => setUserRating(rating)}
                >
                  <Text style={[styles.starText, selected && styles.starTextSelected]}>★</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <Text style={styles.label}>Notes</Text>
          <ScrollView>
            <TextInput
              style={styles.notesInput}
              multiline
              value={notes}
              onChangeText={setNotes}
              placeholder="What did you like? Any tweaks for next time?"
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={() => onSave({ userRating, notes: notes.trim() })}
            >
              <Text style={styles.saveBtnText}>Save notes</Text>
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
    maxHeight: '85%',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#0f172a', marginBottom: 18 },
  label: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 8, textTransform: 'uppercase' },
  ratingRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  starButton: { paddingVertical: 4 },
  starText: { fontSize: 30, color: '#cbd5e1' },
  starTextSelected: { color: '#f59e0b' },
  notesInput: {
    minHeight: 140,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0f172a',
  },
  saveBtn: {
    borderRadius: 14,
    backgroundColor: '#0f766e',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginTop: 16,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { alignItems: 'center', justifyContent: 'center', minHeight: 44, marginTop: 8 },
  cancelText: { color: '#64748b', fontSize: 14, fontWeight: '600' },
})
