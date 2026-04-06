import React from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export interface PriceCompareStore {
  storeId: string
  storeName: string
  totalCost: number
  distanceMiles: number
  hasLivePrices?: boolean
}

interface PriceCompareBarProps {
  storeResults: PriceCompareStore[]
  selectedStoreId: string
  onSelectStore: (storeId: string) => void
}

export function PriceCompareBar({
  storeResults,
  selectedStoreId,
  onSelectStore,
}: PriceCompareBarProps) {
  return (
    <View>
      <Text style={styles.label}>Store comparison</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {storeResults.map((store) => {
          const selected = store.storeId === selectedStoreId
          return (
            <TouchableOpacity
              key={store.storeId}
              testID={`price-compare-store-${store.storeId}`}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => onSelectStore(store.storeId)}
            >
              <Text style={[styles.storeName, selected && styles.storeNameSelected]}>
                {store.storeName}
              </Text>
              <Text style={[styles.meta, selected && styles.metaSelected]}>
                {store.hasLivePrices === false ? 'No live prices' : `$${store.totalCost.toFixed(2)}`}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: '#4b5563', marginBottom: 10 },
  row: { gap: 10, paddingRight: 12 },
  chip: {
    minWidth: 108,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
  },
  chipSelected: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  storeName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  storeNameSelected: { color: '#166534' },
  meta: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  metaSelected: { color: '#166534' },
})
