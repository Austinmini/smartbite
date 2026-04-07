import React from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { apiClient } from '../../lib/apiClient'

interface ProductInfo {
  upc: string
  name: string
  brand: string | null
  imageUrl: string | null
  unitSize: string | null
  category: string
}

interface ScanConfirmParams {
  upc: string
  storeName?: string
  storeId?: string
  planId?: string
  itemKey?: string   // shopping list item key — if coming from shopping list
}

export default function ScanConfirmScreen() {
  const router = useRouter()
  const params = useLocalSearchParams() as unknown as ScanConfirmParams
  const { upc, storeName = 'Unknown Store', storeId, planId, itemKey } = params

  const [product, setProduct] = React.useState<ProductInfo | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [notFound, setNotFound] = React.useState(false)

  const [price, setPrice] = React.useState('')
  const [quantity, setQuantity] = React.useState('1')
  const [unit, setUnit] = React.useState('each')
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    async function lookup() {
      try {
        const res = await apiClient.get<ProductInfo>(`/products/lookup/${upc}`)
        if (res) {
          setProduct(res)
          if (res.unitSize) setUnit(res.unitSize)
        } else {
          setNotFound(true)
        }
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    lookup()
  }, [upc])

  async function handleSubmit() {
    const priceNum = parseFloat(price)
    const qtyNum = parseFloat(quantity)

    if (!priceNum || priceNum <= 0) {
      Alert.alert('Price required', 'Please enter the shelf price.')
      return
    }
    if (!qtyNum || qtyNum <= 0) {
      Alert.alert('Invalid quantity', 'Please enter a valid quantity.')
      return
    }

    setSubmitting(true)
    try {
      // Submit community price observation
      await apiClient.post('/prices/observation', {
        upc,
        storeId: storeId ?? storeName,
        storeName,
        storeLocation: { lat: 0, lng: 0, address: '', city: '', state: 'TX' },
        price: priceNum,
        unitSize: unit,
      })

      // If came from shopping list, also record purchase
      if (planId && itemKey && product) {
        const purchase = await apiClient.post<{ purchase: { id: string } }>('/purchases', {
          itemName: product.name,
          quantity: qtyNum,
          unit,
          pricePerUnit: priceNum / qtyNum,
          totalPrice: priceNum,
          storeName,
          planId,
        })

        await apiClient.post('/pantry/sync-purchase', {
          itemName: product.name,
          quantity: qtyNum,
          unit,
          storeName,
          purchaseId: purchase.purchase.id,
        })
      }

      router.replace({
        pathname: '/scanner/success',
        params: {
          productName: product?.name ?? 'Item',
          storeName,
          price,
          planId: planId ?? '',
          itemKey: itemKey ?? '',
        },
      })
    } catch (err: any) {
      Alert.alert('Could not submit', err.message ?? 'Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#22c55e" />
        <Text style={styles.loadingText}>Looking up product…</Text>
      </View>
    )
  }

  const displayName = product?.name ?? 'Unknown product'
  const displayBrand = product?.brand ?? null

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {/* Product card */}
        <View style={styles.productCard}>
          {product?.imageUrl ? (
            <Image source={{ uri: product.imageUrl }} style={styles.productImage} resizeMode="contain" />
          ) : (
            <View style={styles.productImagePlaceholder}>
              <Text style={styles.productImagePlaceholderText}>📦</Text>
            </View>
          )}
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{displayName}</Text>
            {displayBrand && <Text style={styles.productBrand}>{displayBrand}</Text>}
            {product?.unitSize && <Text style={styles.productUnit}>{product.unitSize}</Text>}
            {notFound && (
              <Text style={styles.notFoundTag}>Product not in database — your scan helps!</Text>
            )}
          </View>
        </View>

        <Text style={styles.storeLabel}>at {storeName}</Text>

        {/* Price input */}
        <Text style={styles.fieldLabel}>Shelf price ($)</Text>
        <TextInput
          style={styles.input}
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
          placeholder="e.g. 4.99"
          testID="price-input"
          autoFocus
        />

        {/* Quantity */}
        <Text style={styles.fieldLabel}>Quantity</Text>
        <TextInput
          style={styles.input}
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="decimal-pad"
          placeholder="e.g. 1"
          testID="quantity-input"
        />

        {/* Unit */}
        <Text style={styles.fieldLabel}>Unit</Text>
        <TextInput
          style={styles.input}
          value={unit}
          onChangeText={setUnit}
          placeholder="e.g. lb, each, oz"
          autoCapitalize="none"
          testID="unit-input"
        />

        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          testID="submit-scan-btn"
        >
          {submitting
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.submitBtnText}>Submit price report</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={styles.cancelBtnText}>Scan a different item</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#6b7280', fontSize: 15 },
  content: { padding: 24, paddingBottom: 48 },

  productCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    flexDirection: 'row', gap: 14, alignItems: 'center',
    marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  productImage: { width: 80, height: 80, borderRadius: 10 },
  productImagePlaceholder: {
    width: 80, height: 80, borderRadius: 10, backgroundColor: '#f3f4f6',
    alignItems: 'center', justifyContent: 'center',
  },
  productImagePlaceholderText: { fontSize: 36 },
  productInfo: { flex: 1, gap: 3 },
  productName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  productBrand: { fontSize: 13, color: '#6b7280' },
  productUnit: { fontSize: 13, color: '#9ca3af' },
  notFoundTag: { fontSize: 12, color: '#22c55e', fontWeight: '600', marginTop: 4 },

  storeLabel: { fontSize: 14, color: '#6b7280', marginBottom: 24, marginTop: 4 },

  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 16,
    color: '#111827', marginBottom: 16, backgroundColor: '#fff',
  },

  submitBtn: {
    backgroundColor: '#22c55e', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', minHeight: 44, marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelBtn: { alignItems: 'center', paddingVertical: 14, minHeight: 44 },
  cancelBtnText: { color: '#6b7280', fontSize: 14 },
})
