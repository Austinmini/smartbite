import React from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { apiClient } from '../../lib/apiClient'
import { useAuthStore } from '../../stores/authStore'
import { PriceTrendChart } from '../../components/PriceTrendChart'
import { AiSuggestionCard } from '../../components/AiSuggestionCard'
import type { TrendBucket } from '../../components/PriceTrendChart'

interface SuggestionResponse {
  recommendation: 'buy' | 'hold' | 'substitute'
  reasoning: string
}

export default function PriceTrendScreen() {
  const { ingredient, storeId, storeName } = useLocalSearchParams<{
    ingredient: string
    storeId: string
    storeName: string
  }>()
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)

  const [days, setDays] = React.useState<7 | 30 | 90>(30)
  const [trendData, setTrendData] = React.useState<TrendBucket[]>([])
  const [trendLoading, setTrendLoading] = React.useState(true)
  const [suggestion, setSuggestion] = React.useState<SuggestionResponse | null>(null)
  const [suggestionLoading, setSuggestionLoading] = React.useState(false)

  const isPro = user?.tier === 'PRO'

  React.useEffect(() => {
    if (!ingredient || !storeId || !token) return
    loadTrend()
  }, [ingredient, storeId, days, token])

  React.useEffect(() => {
    if (!ingredient || !storeId || !token || !isPro) return
    loadSuggestion()
  }, [ingredient, storeId, token])

  async function loadTrend() {
    setTrendLoading(true)
    try {
      const data = await apiClient.get<{ buckets: TrendBucket[] }>(
        `/prices/trends?ingredient=${encodeURIComponent(ingredient!)}&storeId=${storeId}&days=${days}`,
        token!
      )
      setTrendData(data.buckets)
    } catch {
      setTrendData([])
    } finally {
      setTrendLoading(false)
    }
  }

  async function loadSuggestion() {
    setSuggestionLoading(true)
    try {
      const data = await apiClient.get<SuggestionResponse>(
        `/prices/suggestion?ingredient=${encodeURIComponent(ingredient!)}&storeId=${storeId}`,
        token!
      )
      setSuggestion(data)
    } catch {
      setSuggestion(null)
    } finally {
      setSuggestionLoading(false)
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {trendLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#22c55e" />
        </View>
      ) : (
        <PriceTrendChart
          ingredient={ingredient ?? ''}
          storeName={storeName ?? storeId ?? ''}
          data={trendData}
          days={days}
          onDaysChange={(d) => setDays(d)}
        />
      )}

      <View style={styles.suggestionSection}>
        <AiSuggestionCard
          recommendation={suggestion?.recommendation ?? null}
          reasoning={suggestion?.reasoning ?? null}
          tier={user?.tier ?? 'FREE'}
          loading={suggestionLoading}
          onUpgrade={() => {}}
        />
      </View>

      <Text style={styles.disclaimer}>
        ~Prices are estimates based on community scans and may vary. Verify at checkout.
      </Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { paddingBottom: 48 },
  centered: { padding: 40, alignItems: 'center' },
  suggestionSection: { paddingHorizontal: 16, paddingTop: 12 },
  disclaimer: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
    lineHeight: 16,
  },
})
