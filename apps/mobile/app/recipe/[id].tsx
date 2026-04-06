import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMealPlanStore } from '../../stores/mealPlanStore'
import { useAuthStore } from '../../stores/authStore'
import { NutritionCard } from '../../components/NutritionCard'
import { PriceCompareBar } from '../../components/PriceCompareBar'
import { BestStoreCard } from '../../components/BestStoreCard'
import { apiClient } from '../../lib/apiClient'

interface PriceItem {
  ingredient: string
  price: number
  unit: string
  available: boolean
}

interface PriceStoreResult {
  storeId: string
  storeName: string
  totalCost: number
  distanceMiles: number
  items: PriceItem[]
}

interface SplitOption {
  totalCost: number
  savings: number
  worthSplitting: boolean
  stores: Array<PriceStoreResult & { subtotal: number; assignedItems: string[] }>
}

interface PriceScanResponse {
  bestSingleStore: PriceStoreResult
  bestSplitOption: SplitOption | null
  storeResults: PriceStoreResult[]
  cached: boolean
  hasAnyPrices: boolean
  message?: string
}

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const plan = useMealPlanStore((s) => s.plan)
  const token = useAuthStore((s) => s.token)
  const [regenerating, setRegenerating] = React.useState(false)
  const [priceData, setPriceData] = React.useState<PriceScanResponse | null>(null)

  // Mark as Cooked
  const [cookSheet, setCookSheet] = React.useState(false)
  const [cookServings, setCookServings] = React.useState('')
  const [cooking, setCooking] = React.useState(false)
  const [cookResult, setCookResult] = React.useState<{
    deductions: { ingredientName: string; deducted: number; unit: string; remaining: number }[]
    missingFromPantry: string[]
    timesCooked: number
  } | null>(null)
  const [priceMode, setPriceMode] = React.useState<'single' | 'split'>('single')
  const [selectedStoreId, setSelectedStoreId] = React.useState<string | null>(null)
  const [priceLoading, setPriceLoading] = React.useState(false)
  const [priceError, setPriceError] = React.useState<string | null>(null)

  // Find meal by id
  const meal = plan?.meals.find((m) => m.id === id)

  React.useEffect(() => {
    let active = true

    async function loadPrices() {
      if (!meal || !plan || !token) return

      setPriceLoading(true)
      setPriceError(null)

      try {
        const response = await apiClient.get<PriceScanResponse>(
          `/prices/scan?recipeId=${meal.recipe.id}&planId=${plan.id}`,
          token
        )

        if (!active) return

        setPriceData(response)
        setSelectedStoreId(response.bestSingleStore.storeId)
        setPriceMode(response.bestSplitOption ? 'split' : 'single')
      } catch (err: any) {
        if (active) {
          setPriceError(err.message ?? 'Could not load live prices.')
        }
      } finally {
        if (active) setPriceLoading(false)
      }
    }

    loadPrices()
    return () => {
      active = false
    }
  }, [meal, plan, token])

  async function handleRegenerate() {
    if (!meal || !plan) return
    setRegenerating(true)
    try {
      const res = await fetch(`${API_BASE}/plans/${plan.id}/regenerate-meal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mealId: meal.id }),
      })
      if (!res.ok) throw new Error('Failed to regenerate meal')
      const body = await res.json()
      // Update meal in plan
      const updatedPlan = {
        ...plan,
        totalEstCost: body.totalEstCost ?? plan.totalEstCost,
        meals: plan.meals.map((m) => (m.id === meal.id ? { ...m, ...body.meal } : m)),
      }
      useMealPlanStore.getState().setPlan(updatedPlan)
      router.replace(`/recipe/${meal.id}`)
    } catch {
      Alert.alert('Error', 'Could not regenerate this meal. Please try again.')
    } finally {
      setRegenerating(false)
    }
  }

  async function handleMarkAsCooked() {
    if (!meal) return
    const servings = parseFloat(cookServings)
    if (!servings || servings <= 0) {
      Alert.alert('Invalid servings', 'Please enter a valid number of servings.')
      return
    }
    setCooking(true)
    try {
      const result = await apiClient.post<{
        deductions: { ingredientName: string; deducted: number; unit: string; remaining: number }[]
        missingFromPantry: string[]
        timesCooked: number
      }>(`/recipes/${meal.recipe.id}/cooked`, {
        servings,
        planMealId: meal.id,
      })
      setCookSheet(false)
      setCookResult(result)
    } catch (err: any) {
      Alert.alert('Could not record', err.message ?? 'Please try again.')
    } finally {
      setCooking(false)
    }
  }

  if (!meal) {
    return (
      <View style={styles.notFound} testID="recipe-detail-screen">
        <Text style={styles.notFoundText}>Meal not found.</Text>
      </View>
    )
  }

  const { recipe } = meal
  const selectedStore = priceData?.storeResults.find((store) => store.storeId === selectedStoreId)
  const hasAnyPrices = priceData?.hasAnyPrices ?? false

  return (
    <ScrollView style={styles.container} testID="recipe-detail-screen">
      {/* Header */}
      <View style={styles.hero}>
        <Text style={styles.mealType}>{meal.mealType}</Text>
        <Text style={styles.title}>{recipe.title}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaItem}>{recipe.readyInMinutes} min</Text>
          <Text style={styles.metaItem}>{recipe.servings} servings</Text>
          <Text style={styles.metaItem}>~${meal.estCost.toFixed(2)} total</Text>
        </View>
      </View>

      {/* Nutrition */}
      <View style={styles.section}>
        <NutritionCard nutrition={recipe.nutrition} />
      </View>

      {/* Ingredients */}
      <View style={styles.section} testID="ingredients-list">
        <Text style={styles.sectionTitle}>Ingredients</Text>
        {recipe.ingredients.map((ing, i) => (
          <View key={i} style={styles.ingredientRow}>
            <Text style={styles.ingredientDot}>•</Text>
            <Text style={styles.ingredientText}>
              {ing.amount} {ing.unit} {ing.name}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Live pricing</Text>
        {priceLoading ? <ActivityIndicator size="small" color="#22c55e" /> : null}
        {priceError ? <Text style={styles.errorText}>{priceError}</Text> : null}
        {priceData ? (
          <View style={styles.pricingStack}>
            {!hasAnyPrices && priceData.message ? (
              <View style={styles.noticeCard}>
                <Text style={styles.noticeTitle}>Live prices are temporarily unavailable</Text>
                <Text style={styles.noticeBody}>{priceData.message}</Text>
              </View>
            ) : null}

            <BestStoreCard
              title={hasAnyPrices ? 'Best single store' : 'Closest selected store'}
              storeName={priceData.bestSingleStore.storeName}
              totalCost={priceData.bestSingleStore.totalCost}
              distanceMiles={priceData.bestSingleStore.distanceMiles}
              totalLabel={hasAnyPrices ? undefined : 'Live prices unavailable'}
              savingsLabel={
                hasAnyPrices && priceData.bestSplitOption
                  ? `Split basket saves $${priceData.bestSplitOption.savings.toFixed(2)}`
                  : undefined
              }
            />

            <PriceCompareBar
              storeResults={priceData.storeResults.map((store) => ({
                ...store,
                hasLivePrices: store.items.some((item) => item.available),
              }))}
              selectedStoreId={selectedStoreId ?? priceData.bestSingleStore.storeId}
              onSelectStore={setSelectedStoreId}
            />

            <View style={styles.modeRow}>
              <TouchableOpacity
                style={[styles.modeChip, priceMode === 'single' && styles.modeChipSelected]}
                onPress={() => setPriceMode('single')}
              >
                <Text style={[styles.modeText, priceMode === 'single' && styles.modeTextSelected]}>
                  {hasAnyPrices ? 'Best single store' : 'Store availability'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modeChip,
                  priceMode === 'split' && styles.modeChipSelected,
                  !priceData.bestSplitOption && styles.modeChipDisabled,
                ]}
                disabled={!priceData.bestSplitOption}
                onPress={() => setPriceMode('split')}
              >
                <Text style={[styles.modeText, priceMode === 'split' && styles.modeTextSelected]}>
                  2-store split
                </Text>
              </TouchableOpacity>
            </View>

            {priceMode === 'single' && selectedStore ? (
              <View style={styles.pricePanel}>
                {selectedStore.items.map((item) => (
                  <View key={`${selectedStore.storeId}-${item.ingredient}`} style={styles.priceRow}>
                    <Text style={styles.priceIngredient}>{item.ingredient}</Text>
                    <Text style={[styles.priceValue, !item.available && styles.priceValueMuted]}>
                      {item.available ? `$${item.price.toFixed(2)}` : 'No live price at this store'}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {priceMode === 'split' && priceData.bestSplitOption ? (
              <View style={styles.splitStack}>
                {priceData.bestSplitOption.stores.map((store) => (
                  <View key={store.storeId} style={styles.splitCard}>
                    <Text style={styles.splitStore}>{store.storeName}</Text>
                    <Text style={styles.splitSubtotal}>${store.subtotal.toFixed(2)} subtotal</Text>
                    {store.assignedItems.map((item) => (
                      <Text key={`${store.storeId}-${item}`} style={styles.splitItem}>
                        {item}
                      </Text>
                    ))}
                  </View>
                ))}
              </View>
            ) : null}

            {plan ? (
              <TouchableOpacity
                style={styles.shoppingListBtn}
                onPress={() => router.push(`/shopping-list/${plan.id}`)}
              >
                <Text style={styles.shoppingListBtnText}>Get shopping list</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </View>

      {/* Instructions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Instructions</Text>
        {recipe.instructions.map((step) => (
          <View key={step.step} style={styles.stepRow}>
            <Text style={styles.stepNumber}>{step.step}</Text>
            <Text style={styles.stepText}>{step.text}</Text>
          </View>
        ))}
      </View>

      {/* Mark as Cooked */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.cookBtn}
          testID="mark-as-cooked-btn"
          onPress={() => { setCookServings(String(meal.recipe.servings)); setCookSheet(true) }}
        >
          <Text style={styles.cookBtnText}>✓  Mark as cooked</Text>
        </TouchableOpacity>
      </View>

      {/* Cook result summary */}
      {cookResult && (
        <View style={styles.section}>
          <View style={styles.cookResultCard}>
            <Text style={styles.cookResultTitle}>Cooked! Pantry updated</Text>
            {cookResult.timesCooked > 0 && (
              <Text style={styles.cookResultMeta}>
                You've cooked this {cookResult.timesCooked}× total
              </Text>
            )}
            {cookResult.deductions.map((d) => (
              <Text key={d.ingredientName} style={styles.cookResultRow}>
                − {d.deducted} {d.unit} {d.ingredientName} → {d.remaining} {d.unit} remaining
              </Text>
            ))}
            {cookResult.missingFromPantry.length > 0 && (
              <Text style={styles.cookResultMissing}>
                Not in pantry: {cookResult.missingFromPantry.join(', ')}
              </Text>
            )}
            <TouchableOpacity onPress={() => setCookResult(null)}>
              <Text style={styles.cookResultDismiss}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Regenerate */}
      <View style={styles.section}>
        {regenerating ? (
          <ActivityIndicator size="small" color="#22c55e" />
        ) : (
          <TouchableOpacity
            style={styles.regenerateBtn}
            testID="regenerate-meal-btn"
            onPress={handleRegenerate}
          >
            <Text style={styles.regenerateBtnText}>Regenerate this meal</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.disclaimer}>
        Nutritional information is approximate. Consult a healthcare provider for dietary advice.
      </Text>
    </ScrollView>

    {/* Servings picker sheet */}
    <Modal visible={cookSheet} animationType="slide" transparent onRequestClose={() => setCookSheet(false)}>
      <View style={styles.sheetOverlay}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>How many servings did you make?</Text>
          <Text style={styles.sheetSubtitle}>Recipe makes {meal.recipe.servings} servings</Text>
          <TextInput
            style={styles.input}
            value={cookServings}
            onChangeText={setCookServings}
            keyboardType="decimal-pad"
            placeholder={String(meal.recipe.servings)}
            testID="cook-servings-input"
          />
          <TouchableOpacity
            style={[styles.confirmBtn, cooking && styles.confirmBtnDisabled]}
            onPress={handleMarkAsCooked}
            disabled={cooking}
            testID="confirm-cook-btn"
          >
            {cooking
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.confirmBtnText}>Confirm</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setCookSheet(false)}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

// React import needed for useState
import React from 'react'

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  notFound: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  notFoundText: { fontSize: 16, color: '#666' },
  hero: { padding: 24, paddingBottom: 16, backgroundColor: '#f0fdf4' },
  mealType: { fontSize: 11, fontWeight: '600', color: '#22c55e', letterSpacing: 0.5, marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  metaRow: { flexDirection: 'row', gap: 16 },
  metaItem: { fontSize: 13, color: '#555' },
  section: { paddingHorizontal: 24, paddingVertical: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: '#1a1a1a', marginBottom: 10 },
  ingredientRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  ingredientDot: { color: '#22c55e', fontSize: 16 },
  ingredientText: { fontSize: 14, color: '#333', flex: 1 },
  pricingStack: { gap: 14 },
  errorText: { fontSize: 13, color: '#dc2626' },
  noticeCard: {
    borderRadius: 16,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    padding: 16,
    gap: 6,
  },
  noticeTitle: { fontSize: 14, fontWeight: '700', color: '#92400e' },
  noticeBody: { fontSize: 13, lineHeight: 19, color: '#a16207' },
  modeRow: { flexDirection: 'row', gap: 10 },
  modeChip: {
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modeChipSelected: {
    backgroundColor: '#dcfce7',
  },
  modeChipDisabled: {
    opacity: 0.5,
  },
  modeText: { fontSize: 13, fontWeight: '600', color: '#4b5563' },
  modeTextSelected: { color: '#166534' },
  pricePanel: {
    borderRadius: 16,
    backgroundColor: '#f9fafb',
    padding: 16,
    gap: 10,
  },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  priceIngredient: { fontSize: 14, color: '#111827', flex: 1 },
  priceValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  priceValueMuted: { color: '#6b7280', fontWeight: '500' },
  splitStack: { gap: 12 },
  splitCard: {
    borderRadius: 16,
    backgroundColor: '#f9fafb',
    padding: 16,
    gap: 6,
  },
  splitStore: { fontSize: 16, fontWeight: '700', color: '#111827' },
  splitSubtotal: { fontSize: 14, color: '#22c55e', fontWeight: '600' },
  splitItem: { fontSize: 13, color: '#4b5563' },
  shoppingListBtn: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  shoppingListBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  stepRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#22c55e',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 12,
    fontWeight: '700',
  },
  stepText: { fontSize: 14, color: '#333', flex: 1, lineHeight: 20 },
  cookBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 44,
  },
  cookBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  cookResultCard: {
    backgroundColor: '#f0fdf4', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#bbf7d0', gap: 6,
  },
  cookResultTitle: { fontSize: 15, fontWeight: '700', color: '#15803d' },
  cookResultMeta: { fontSize: 13, color: '#16a34a' },
  cookResultRow: { fontSize: 13, color: '#374151' },
  cookResultMissing: { fontSize: 13, color: '#9ca3af', fontStyle: 'italic', marginTop: 4 },
  cookResultDismiss: { fontSize: 13, color: '#6b7280', marginTop: 8, textAlign: 'right' },
  regenerateBtn: {
    borderWidth: 1,
    borderColor: '#22c55e',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    minHeight: 44,
  },
  regenerateBtnText: { color: '#22c55e', fontSize: 14, fontWeight: '600' },
  // Sheet (shared with cook modal)
  sheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 6 },
  sheetSubtitle: { fontSize: 14, color: '#6b7280', marginBottom: 20 },
  input: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 16,
    color: '#111827', marginBottom: 16,
  },
  confirmBtn: {
    backgroundColor: '#22c55e', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', minHeight: 44,
  },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelBtn: { alignItems: 'center', paddingVertical: 14, minHeight: 44 },
  cancelBtnText: { color: '#6b7280', fontSize: 14 },
  disclaimer: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
    paddingHorizontal: 24,
    paddingBottom: 32,
    lineHeight: 16,
  },
})
