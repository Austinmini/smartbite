import React from 'react'
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { FeedbackSheet } from '../../components/FeedbackSheet'
import { apiClient } from '../../lib/apiClient'
import { useAuthStore } from '../../stores/authStore'

interface SuccessParams {
  productName: string
  storeName: string
  price: string
  planId?: string
  itemKey?: string
}

export default function ScanSuccessScreen() {
  const router = useRouter()
  const { productName, storeName, price, planId } = useLocalSearchParams() as unknown as SuccessParams
  const token = useAuthStore((state) => state.token)
  const [feedbackVisible, setFeedbackVisible] = React.useState(false)

  function handleDone() {
    if (planId) {
      router.replace({ pathname: '/shopping-list/[planId]', params: { planId } })
    } else {
      router.replace('/(tabs)')
    }
  }

  function handleScanAnother() {
    router.replace('/scanner')
  }

  async function handleSubmitFeedback(payload: {
    type: 'BUG' | 'FEATURE_REQUEST' | 'PRICE_ISSUE' | 'GENERAL'
    subject?: string
    body: string
  }) {
    try {
      await apiClient.post('/feedback', payload, token ?? undefined)
      setFeedbackVisible(false)
      Alert.alert('Thanks!', "We'll review your feedback.")
    } catch (err: any) {
      Alert.alert('Could not send feedback', err.message ?? 'Please try again.')
    }
  }

  return (
    <>
    <View style={styles.container}>
      {/* Celebration */}
      <View style={styles.iconRing}>
        <Text style={styles.icon}>✅</Text>
      </View>

      <Text style={styles.headline}>Price reported!</Text>
      <Text style={styles.subheadline}>Thanks for helping your community save money.</Text>

      {/* What was scanned */}
      <View style={styles.card}>
        <Text style={styles.cardProduct} numberOfLines={2}>{productName}</Text>
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>at {storeName}</Text>
          <Text style={styles.cardPrice}>${price}</Text>
        </View>
      </View>

      {/* Bites earned */}
      <View style={styles.bitesCard}>
        <Text style={styles.bitesEmoji}>🍪</Text>
        <View>
          <Text style={styles.bitesHeadline}>+5 Bites earned</Text>
          <Text style={styles.bitesBody}>Keep scanning to build your streak</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.primaryBtn} onPress={handleDone}>
        <Text style={styles.primaryBtnText}>
          {planId ? 'Back to shopping list' : 'Done'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryBtn} onPress={handleScanAnother}>
        <Text style={styles.secondaryBtnText}>Scan another item</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryBtn} onPress={() => setFeedbackVisible(true)}>
        <Text style={styles.secondaryBtnText}>Report wrong price</Text>
      </TouchableOpacity>
    </View>
    <FeedbackSheet
      visible={feedbackVisible}
      onClose={() => setFeedbackVisible(false)}
      onSubmit={handleSubmitFeedback}
      initialType="PRICE_ISSUE"
      initialSubject={`${productName} price issue`}
      initialBody={`Wrong price reported for ${productName} at ${storeName}. Expected review for $${price}.`}
    />
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#f0fdf4',
    alignItems: 'center', justifyContent: 'center',
    padding: 32,
  },

  iconRing: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  icon: { fontSize: 48 },

  headline: {
    fontSize: 28, fontWeight: '800', color: '#15803d', marginBottom: 8,
  },
  subheadline: {
    fontSize: 15, color: '#16a34a', textAlign: 'center', marginBottom: 28,
    lineHeight: 22,
  },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20,
    width: '100%', marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardProduct: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: { fontSize: 14, color: '#6b7280' },
  cardPrice: { fontSize: 18, fontWeight: '800', color: '#16a34a' },

  bitesCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    width: '100%', marginBottom: 32,
    borderWidth: 2, borderColor: '#86efac',
  },
  bitesEmoji: { fontSize: 36 },
  bitesHeadline: { fontSize: 16, fontWeight: '700', color: '#15803d' },
  bitesBody: { fontSize: 13, color: '#16a34a', marginTop: 2 },

  primaryBtn: {
    backgroundColor: '#22c55e', borderRadius: 14,
    paddingVertical: 16, paddingHorizontal: 32,
    alignItems: 'center', width: '100%', minHeight: 52, marginBottom: 12,
  },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  secondaryBtn: { paddingVertical: 14, minHeight: 44 },
  secondaryBtnText: { color: '#16a34a', fontSize: 15, fontWeight: '600' },
})
