import React from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { apiClient } from '../../lib/apiClient'
import { useAuthStore } from '../../stores/authStore'
import { useShoppingListStore } from '../../stores/shoppingListStore'

interface ShoppingListItem {
  key: string
  ingredient: string
  amount: number
  unit: string
}

interface ShoppingListResponse {
  planId: string
  totalItems: number
  stores: Array<{
    storeName: string
    items: ShoppingListItem[]
  }>
}

export default function ShoppingListScreen() {
  const { planId } = useLocalSearchParams<{ planId: string }>()
  const token = useAuthStore((state) => state.token)
  const { toggleItem, isChecked, getCheckedCount } = useShoppingListStore()
  const [data, setData] = React.useState<ShoppingListResponse | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let active = true

    async function loadShoppingList() {
      if (!planId || !token) {
        if (active) {
          setError('Sign in to load your shopping list.')
          setLoading(false)
        }
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
    return () => {
      active = false
    }
  }, [planId, token])

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
                style={[styles.itemRow, checked && styles.itemRowChecked]}
                onPress={() => toggleItem(data.planId, item.key)}
              >
                <View style={[styles.checkbox, checked && styles.checkboxChecked]} />
                <Text style={[styles.itemText, checked && styles.itemTextChecked]}>
                  {item.amount} {item.unit} {item.ingredient}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingBottom: 48 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 15, color: '#6b7280', marginTop: 8 },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
    marginTop: 16,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#22c55e' },
  group: { marginTop: 24, borderRadius: 18, backgroundColor: '#f9fafb', padding: 18 },
  groupTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 10 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  itemRowChecked: { opacity: 0.65 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#9ca3af',
  },
  checkboxChecked: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  itemText: { fontSize: 15, color: '#111827', flex: 1 },
  itemTextChecked: { textDecorationLine: 'line-through', color: '#6b7280' },
  errorText: { fontSize: 15, color: '#dc2626', textAlign: 'center' },
})
