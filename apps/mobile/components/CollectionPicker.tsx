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
import type { RecipeCollection } from '../stores/savedRecipesStore'

interface Props {
  visible: boolean
  collections: RecipeCollection[]
  onClose: () => void
  onSelectCollection: (collectionId: string) => void
  onCreateCollection: (name: string, emoji?: string) => void
}

export function CollectionPicker({
  visible,
  collections,
  onClose,
  onSelectCollection,
  onCreateCollection,
}: Props) {
  const [name, setName] = React.useState('')
  const [emoji, setEmoji] = React.useState('❤️')

  function handleCreate() {
    const trimmed = name.trim()
    if (!trimmed) return
    onCreateCollection(trimmed, emoji.trim() || '❤️')
    setName('')
    setEmoji('❤️')
  }

  if (!visible) return null

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Add to collection</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {collections.map((collection) => (
              <TouchableOpacity
                key={collection.id}
                style={styles.collectionRow}
                onPress={() => onSelectCollection(collection.id)}
              >
                <Text style={styles.collectionEmoji}>{collection.emoji}</Text>
                <View style={styles.collectionMeta}>
                  <Text style={styles.collectionName}>{collection.name}</Text>
                  <Text style={styles.collectionCount}>{collection.recipeIds.length} recipes</Text>
                </View>
              </TouchableOpacity>
            ))}

            <View style={styles.createCard}>
              <Text style={styles.sectionLabel}>New collection</Text>
              <View style={styles.inlineRow}>
                <TextInput
                  style={styles.emojiInput}
                  value={emoji}
                  onChangeText={setEmoji}
                  maxLength={2}
                  placeholder="❤️"
                />
                <TextInput
                  style={styles.nameInput}
                  value={name}
                  onChangeText={setName}
                  placeholder="Collection name"
                />
              </View>
              <TouchableOpacity style={styles.createBtn} onPress={handleCreate}>
                <Text style={styles.createBtnText}>Create collection</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Done</Text>
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
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a', marginBottom: 18 },
  collectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    padding: 14,
    marginBottom: 10,
  },
  collectionEmoji: { fontSize: 22 },
  collectionMeta: { flex: 1 },
  collectionName: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  collectionCount: { fontSize: 12, color: '#64748b', marginTop: 2 },
  createCard: {
    borderRadius: 16,
    backgroundColor: '#ecfeff',
    padding: 16,
    marginTop: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#155e75',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  inlineRow: { flexDirection: 'row', gap: 10 },
  emojiInput: {
    width: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#a5f3fc',
    backgroundColor: '#fff',
    textAlign: 'center',
    fontSize: 22,
    paddingVertical: 10,
  },
  nameInput: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#a5f3fc',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0f172a',
  },
  createBtn: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: '#0891b2',
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cancelBtn: { marginTop: 14, alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  cancelText: { color: '#64748b', fontWeight: '600', fontSize: 14 },
})
