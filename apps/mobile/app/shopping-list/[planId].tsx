import React from 'react'
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { apiClient } from '../../lib/apiClient'
import { useAuthStore } from '../../stores/authStore'
import { useShoppingListStore } from '../../stores/shoppingListStore'

interface LastPurchase {
  quantity: number
  unit: string
  storeName: string
  purchasedAt: string
}

interface ShoppingListItem {
  key: string
  ingredient: string
  amount: number
  unit: string
  lastPurchase: LastPurchase | null
}

interface ShoppingListResponse {
  planId: string
  totalItems: number
  stores: Array<{
    storeName: string
    items: ShoppingListItem[]
  }>
}

interface ConfirmSheet {
  item: ShoppingListItem
  storeName: string
}

export default function ShoppingListScreen() {
  const { planId } = useLocalSearchParams<{ planId: string }>()
  const token = useAuthStore((state) => state.token)
  const { toggleItem, isChecked, getCheckedCount } = useShoppingListStore()

  const [data, setData] = React.useState<ShoppingListResponse | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Confirm-purchase sheet state
  const [confirmSheet, setConfirmSheet] = React.useState<ConfirmSheet | null>(null)
  const [confirmQty, setConfirmQty] = React.useState('')
  const [confirmPrice, setConfirmPrice] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    let active = true
    async function loadShoppingList() {
      if (!planId || !token) {
        if (active) { setError('Sign in to load your shopping list.'); setLoading(false) }
        return
      }
      try {
        const response = await apiClient.get<ShoppingListResponse>(`/prices/shopping-list/${planId}`, token)
        if (active) setData(response)
      } catch (err: any) {
        if (active) setError(err.message ?? 'Could not load shopping list.')
      } finally {
        if (active) setLoading(false)
      }
    }
    loadShoppingList()
    return () => { active = false }
  }, [planId, token])

  function openConfirmSheet(item: ShoppingListItem, storeName: string) {
    setConfirmQty(String(item.amount))
    setConfirmPrice('')
    setConfirmSheet({ item, storeName })
  }

  async function handleConfirmPurchase() {
    if (!confirmSheet || !planId) return
    const { item, storeName } = confirmSheet
    const qty = parseFloat(confirmQty)
    const price = parseFloat(confirmPrice)

    if (!qty || qty <= 0) {
      Alert.alert('Invalid quantity', 'Please enter a valid quantity.')
      return
    }

    setSubmitting(true)
    try {
      // Record purchase
      const purchase = await apiClient.post<{ purchase: { id: string } }>('/purchases', {
        itemName: item.ingredient,
        quantity: qty,
        unit: item.unit,
        pricePerUnit: price > 0 ? price / qty : 0,
        totalPrice: price > 0 ? price : 0,
        storeName,
        planId,
      })

      // Sync into pantry
      await apiClient.post('/pantry/sync-purchase', {
        itemName: item.ingredient,
        quantity: qty,
        unit: item.unit,
        storeName,
        purchaseId: purchase.purchase.id,
      })

      // Check off the item
      toggleItem(planId, item.key)
      setConfirmSheet(null)
    } catch (err: any) {
      Alert.alert('Could not record purchase', err.message ?? 'Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleSkipConfirm() {
    if (!confirmSheet || !planId) return
    toggleItem(planId, confirmSheet.item.key)
    setConfirmSheet(null)
  }

  const checkedCount = planId ? getCheckedCount(planId) : 0
  const progress = data?.totalItems ? Math.round((checkedCount / data.totalItems) * 100) : 0

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    )
  }

  if (error || !data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? 'Shopping list unavailable.'}</Text>
      </View>
    )
  }

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Shopping list</Text>
        <Text style={styles.subtitle}>
          {checkedCount} of {data.totalItems} items checked
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

        {data.stores.map((store) => (
          <View key={store.storeName} style={styles.group}>
            <Text style={styles.groupTitle}>{store.storeName}</Text>
            {store.items.map((item) => {
              const checked = isChecked(data.planId, item.key)
              return (
                <TouchableOpacity
                  key={item.key}
                  testID={`item-${item.key}`}
                  style={[styles.itemRow, checked && styles.itemRowChecked]}
                  onPress={() => {
                    if (checked) {
                      // Uncheck without confirmation
                      toggleItem(data.planId, item.key)
                    } else {
                      openConfirmSheet(item, store.storeName)
                    }
                  }}
                >
                  <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                    {checked && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <View style={styles.itemContent}>
                    <Text style={[styles.itemText, checked && styles.itemTextChecked]}>
                      {item.amount} {item.unit} {item.ingredient}
                    </Text>
                    {item.lastPurchase && !checked && (
                      <Text style={styles.lastPurchaseBadge}>
                        Last bought: {item.lastPurchase.quantity} {item.lastPurchase.unit} @ {item.lastPurchase.storeName}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        ))}
      </ScrollView>

      {/* Purchase confirmation sheet */}
      <Modal
        visible={confirmSheet !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setConfirmSheet(null)}
      >
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>
              {confirmSheet?.item.ingredient}
            </Text>
            <Text style={styles.sheetSubtitle}>
              at {confirmSheet?.storeName}
            </Text>

            <Text style={styles.fieldLabel}>Quantity ({confirmSheet?.item.unit})</Text>
            <TextInput
              style={styles.input}
              value={confirmQty}
              onChangeText={setConfirmQty}
              keyboardType="decimal-pad"
              placeholder={`e.g. ${confirmSheet?.item.amount}`}
              testID="confirm-qty-input"
            />

            <Text style={styles.fieldLabel}>Total price (optional)</Text>
            <TextInput
              style={styles.input}
              value={confirmPrice}
              onChangeText={setConfirmPrice}
              keyboardType="decimal-pad"
              placeholder="e.g. 4.99"
              testID="confirm-price-input"
            />

            <TouchableOpacity
              style={[styles.confirmBtn, submitting && styles.confirmBtnDisabled]}
              onPress={handleConfirmPurchase}
              disabled={submitting}
              testID="confirm-purchase-btn"
            >
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.confirmBtnText}>Confirm & check off</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipBtn} onPress={handleSkipConfirm} testID="skip-confirm-btn">
              <Text style={styles.skipBtnText}>Just check off (skip recording)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingBottom: 48 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 15, color: '#6b7280', marginTop: 8 },
  progressTrack: {
    height: 10, borderRadius: 999, backgroundColor: '#e5e7eb', marginTop: 16, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#22c55e' },
  group: { marginTop: 24, borderRadius: 18, backgroundColor: '#f9fafb', padding: 18 },
  groupTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 10 },
  itemRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb',
    minHeight: 44,
  },
  itemRowChecked: { opacity: 0.55 },
  checkbox: {
    width: 22, height: 22, borderRadius: 999, borderWidth: 2, borderColor: '#9ca3af',
    alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0,
  },
  checkboxChecked: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  checkmark: { color: '#fff', fontSize: 12, fontWeight: '700' },
  itemContent: { flex: 1 },
  itemText: { fontSize: 15, color: '#111827' },
  itemTextChecked: { textDecorationLine: 'line-through', color: '#6b7280' },
  lastPurchaseBadge: {
    fontSize: 12, color: '#6b7280', marginTop: 3,
    backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 999, alignSelf: 'flex-start', overflow: 'hidden',
  },
  errorText: { fontSize: 15, color: '#dc2626', textAlign: 'center' },

  // Sheet
  sheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: '#111827', textTransform: 'capitalize' },
  sheetSubtitle: { fontSize: 14, color: '#6b7280', marginTop: 2, marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 16,
    color: '#111827', marginBottom: 16,
  },
  confirmBtn: {
    backgroundColor: '#22c55e', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', minHeight: 44, marginTop: 4,
  },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  skipBtn: { alignItems: 'center', paddingVertical: 14, minHeight: 44 },
  skipBtnText: { color: '#6b7280', fontSize: 14 },
})
