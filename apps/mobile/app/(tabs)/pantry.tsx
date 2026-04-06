import React from 'react'
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { apiClient } from '../../lib/apiClient'

interface PantryItem {
  id: string
  itemName: string
  itemCategory: string
  quantity: number
  unit: string
  notes: string | null
  lastRestockedAt: string | null
  updatedAt: string
}

type EditorMode = 'add' | 'edit'

interface EditorState {
  mode: EditorMode
  itemName: string
  quantity: string
  unit: string
  notes: string
}

const EMPTY_EDITOR: EditorState = {
  mode: 'add', itemName: '', quantity: '', unit: '', notes: '',
}

export default function PantryScreen() {
  const [items, setItems] = React.useState<PantryItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [editor, setEditor] = React.useState<EditorState | null>(null)
  const [saving, setSaving] = React.useState(false)

  async function loadPantry(quiet = false) {
    if (!quiet) setLoading(true)
    setError(null)
    try {
      const res = await apiClient.get<{ items: PantryItem[] }>('/pantry')
      setItems(res.items)
    } catch (err: any) {
      setError(err.message ?? 'Could not load pantry.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  React.useEffect(() => { loadPantry() }, [])

  function openAdd() {
    setEditor({ ...EMPTY_EDITOR, mode: 'add' })
  }

  function openEdit(item: PantryItem) {
    setEditor({
      mode: 'edit',
      itemName: item.itemName,
      quantity: String(item.quantity),
      unit: item.unit,
      notes: item.notes ?? '',
    })
  }

  async function handleSave() {
    if (!editor) return
    const qty = parseFloat(editor.quantity)
    if (!editor.itemName.trim()) {
      Alert.alert('Name required', 'Please enter an item name.')
      return
    }
    if (!qty || qty <= 0) {
      Alert.alert('Invalid quantity', 'Please enter a valid quantity.')
      return
    }
    if (!editor.unit.trim()) {
      Alert.alert('Unit required', 'Please enter a unit (e.g. lb, each, cups).')
      return
    }

    setSaving(true)
    try {
      if (editor.mode === 'add') {
        await apiClient.post('/pantry', {
          itemName: editor.itemName.trim(),
          quantity: qty,
          unit: editor.unit.trim(),
          notes: editor.notes.trim() || undefined,
        })
      } else {
        await apiClient.put(`/pantry/${encodeURIComponent(editor.itemName)}`, {
          quantity: qty,
          unit: editor.unit.trim(),
          notes: editor.notes.trim() || undefined,
        })
      }
      setEditor(null)
      loadPantry(true)
    } catch (err: any) {
      Alert.alert('Could not save', err.message ?? 'Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(itemName: string) {
    Alert.alert(
      'Remove from pantry',
      `Remove "${itemName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/pantry/${encodeURIComponent(itemName)}`)
              setItems((prev) => prev.filter((i) => i.itemName !== itemName))
            } catch (err: any) {
              Alert.alert('Error', err.message ?? 'Could not remove item.')
            }
          },
        },
      ]
    )
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    )
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadPantry(true) }}
            tintColor="#22c55e"
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Pantry</Text>
          <TouchableOpacity style={styles.addBtn} onPress={openAdd} testID="add-pantry-btn">
            <Text style={styles.addBtnText}>+ Add item</Text>
          </TouchableOpacity>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {items.length === 0 && !error ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Your pantry is empty</Text>
            <Text style={styles.emptyBody}>
              Add items manually, or check off ingredients on your shopping list to fill it automatically.
            </Text>
            <TouchableOpacity style={styles.emptyAddBtn} onPress={openAdd}>
              <Text style={styles.emptyAddBtnText}>Add first item</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.list}>
            {items.map((item) => (
              <View key={item.itemName} style={styles.itemRow}>
                <TouchableOpacity
                  style={styles.itemMain}
                  onPress={() => openEdit(item)}
                  testID={`pantry-item-${item.itemName}`}
                >
                  <Text style={styles.itemName}>{item.itemName}</Text>
                  <View style={styles.qtyChip}>
                    <Text style={styles.qtyChipText}>
                      {item.quantity} {item.unit}
                    </Text>
                  </View>
                  {item.lastRestockedAt && (
                    <Text style={styles.restockedAt}>
                      Restocked {formatDate(item.lastRestockedAt)}
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDelete(item.itemName)}
                  testID={`delete-pantry-${item.itemName}`}
                >
                  <Text style={styles.deleteBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add / Edit sheet */}
      <Modal
        visible={editor !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setEditor(null)}
      >
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>
              {editor?.mode === 'add' ? 'Add pantry item' : `Edit ${editor?.itemName}`}
            </Text>

            {editor?.mode === 'add' && (
              <>
                <Text style={styles.fieldLabel}>Item name</Text>
                <TextInput
                  style={styles.input}
                  value={editor.itemName}
                  onChangeText={(v) => setEditor((e) => e && { ...e, itemName: v })}
                  placeholder="e.g. chicken breast"
                  autoCapitalize="none"
                  testID="editor-name-input"
                />
              </>
            )}

            <Text style={styles.fieldLabel}>Quantity</Text>
            <TextInput
              style={styles.input}
              value={editor?.quantity ?? ''}
              onChangeText={(v) => setEditor((e) => e && { ...e, quantity: v })}
              keyboardType="decimal-pad"
              placeholder="e.g. 2"
              testID="editor-qty-input"
            />

            <Text style={styles.fieldLabel}>Unit</Text>
            <TextInput
              style={styles.input}
              value={editor?.unit ?? ''}
              onChangeText={(v) => setEditor((e) => e && { ...e, unit: v })}
              placeholder="e.g. lb, each, cups, oz"
              autoCapitalize="none"
              testID="editor-unit-input"
            />

            <Text style={styles.fieldLabel}>Notes (optional)</Text>
            <TextInput
              style={styles.input}
              value={editor?.notes ?? ''}
              onChangeText={(v) => setEditor((e) => e && { ...e, notes: v })}
              placeholder="e.g. expires Friday, opened"
              testID="editor-notes-input"
            />

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
              testID="editor-save-btn"
            >
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.saveBtnText}>
                    {editor?.mode === 'add' ? 'Add to pantry' : 'Save changes'}
                  </Text>
              }
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditor(null)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  )
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 24, paddingBottom: 48 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '700', color: '#111827' },
  addBtn: {
    backgroundColor: '#22c55e', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8, minHeight: 36,
  },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  errorBox: {
    backgroundColor: '#fef2f2', borderRadius: 8, padding: 12,
    marginBottom: 16, borderWidth: 1, borderColor: '#fecaca',
  },
  errorText: { color: '#dc2626', fontSize: 14 },

  emptyState: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#111827' },
  emptyBody: { fontSize: 15, color: '#6b7280', textAlign: 'center', lineHeight: 22 },
  emptyAddBtn: {
    backgroundColor: '#22c55e', borderRadius: 12,
    paddingHorizontal: 28, paddingVertical: 14, marginTop: 8, minHeight: 44,
  },
  emptyAddBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  list: { gap: 2 },
  itemRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12,
    marginBottom: 8, overflow: 'hidden',
  },
  itemMain: { flex: 1, padding: 16, gap: 4, minHeight: 44 },
  itemName: { fontSize: 16, fontWeight: '600', color: '#111827', textTransform: 'capitalize' },
  qtyChip: {
    backgroundColor: '#dcfce7', borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start',
  },
  qtyChipText: { fontSize: 13, fontWeight: '600', color: '#15803d' },
  restockedAt: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  deleteBtn: {
    paddingHorizontal: 16, paddingVertical: 20, minWidth: 44, alignItems: 'center',
  },
  deleteBtnText: { fontSize: 16, color: '#9ca3af' },

  // Sheet
  sheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 16,
    color: '#111827', marginBottom: 16,
  },
  saveBtn: {
    backgroundColor: '#22c55e', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', minHeight: 44,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelBtn: { alignItems: 'center', paddingVertical: 14, minHeight: 44 },
  cancelBtnText: { color: '#6b7280', fontSize: 14 },
})
