import { TX_STORE_SEED } from '../data/txStores'
import { prisma } from '../lib/prisma'
import { redis } from '../lib/redis'

export const SPLIT_THRESHOLD = 3
const PRICE_CACHE_TTL_SECONDS = 60 * 60

export interface RecipeIngredient {
  name: string
  amount: number
  unit: string
}

export interface ScanStore {
  storeId: string
  storeName: string
  chain: string
  distanceMiles: number
}

export interface SelectedStore {
  id: string
  name: string
  chain: string
  distanceMiles: number
  address: string
  lat: number
  lng: number
}

function normalizeSelectedStores(value: unknown): SelectedStore[] {
  if (!Array.isArray(value)) return []

  return value.filter(
    (store): store is SelectedStore =>
      Boolean(store) &&
      typeof store === 'object' &&
      typeof (store as SelectedStore).id === 'string' &&
      typeof (store as SelectedStore).name === 'string' &&
      typeof (store as SelectedStore).chain === 'string' &&
      typeof (store as SelectedStore).distanceMiles === 'number' &&
      typeof (store as SelectedStore).address === 'string' &&
      typeof (store as SelectedStore).lat === 'number' &&
      typeof (store as SelectedStore).lng === 'number'
  )
}

export interface StoreItemResult {
  ingredient: string
  price: number
  unit: string
  available: boolean
  source: 'community' | 'estimate'
  estimateTier?: 'store_recent' | 'regional_market' | 'regionalized_baseline' | 'baseline'
}

export interface StoreScanResult {
  storeId: string
  storeName: string
  totalCost: number
  distanceMiles: number
  items: StoreItemResult[]
}

export interface SplitStoreResult extends StoreScanResult {
  subtotal: number
  assignedItems: string[]
}

export interface PriceScanResult {
  bestSingleStore: StoreScanResult
  bestSplitOption: {
    totalCost: number
    savings: number
    worthSplitting: boolean
    stores: SplitStoreResult[]
  } | null
  storeResults: StoreScanResult[]
  cached: boolean
  hasAnyPrices: boolean
  knownSubtotal: number
  estimatedSubtotal: number
  coveragePct: number
  confidencePct: number
  missingIngredients: string[]
  message?: string
}

function normalizeIngredients(value: unknown): RecipeIngredient[] {
  if (!Array.isArray(value)) return []

  return value
    .filter(
      (item): item is RecipeIngredient =>
        Boolean(item) &&
        typeof item === 'object' &&
        typeof (item as RecipeIngredient).name === 'string' &&
        typeof (item as RecipeIngredient).amount === 'number' &&
        typeof (item as RecipeIngredient).unit === 'string'
    )
    .map((item) => ({
      name: item.name,
      amount: item.amount,
      unit: item.unit,
    }))
}

function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100
}

function getCacheKey(recipeId: string, stores: ScanStore[]): string {
  return `prices:scan:${recipeId}:${stores.map((store) => store.storeId).sort().join(',')}`
}

async function getIngredientPrice(
  ingredient: RecipeIngredient,
  store: ScanStore
): Promise<StoreItemResult> {
  const ingredientName = ingredient.name.toLowerCase().trim()

  const sameStoreObservations = await prisma.priceObservation.findMany({
    where: {
      storeId: store.storeId,
      productName: { contains: ingredientName, mode: 'insensitive' },
      scannedAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90) },
    },
    orderBy: { scannedAt: 'desc' },
    take: 25,
  })

  if (sameStoreObservations.length > 0) {
    const avg = sameStoreObservations.reduce((sum, observation) => sum + observation.price, 0) / sameStoreObservations.length
    return {
      ingredient: ingredient.name,
      price: roundCurrency(avg),
      unit: ingredient.unit,
      available: true,
      source: 'community',
      estimateTier: 'store_recent',
    }
  }

  const regionalObservations = await prisma.priceObservation.findMany({
    where: {
      productName: { contains: ingredientName, mode: 'insensitive' },
      scannedAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120) },
    },
    orderBy: { scannedAt: 'desc' },
    take: 50,
  })

  if (regionalObservations.length > 0) {
    const avg = regionalObservations.reduce((sum, observation) => sum + observation.price, 0) / regionalObservations.length
    return {
      ingredient: ingredient.name,
      price: roundCurrency(avg),
      unit: ingredient.unit,
      available: false,
      source: 'estimate',
      estimateTier: 'regional_market',
    }
  }

  const baseline = getBaselineIngredientPrice(ingredientName)
  const regionalizedBaseline = await applyStoreRegionalMultiplier(baseline, store.storeId)
  return {
    ingredient: ingredient.name,
    price: roundCurrency(regionalizedBaseline),
    unit: ingredient.unit,
    available: false,
    source: 'estimate',
    estimateTier: baseline === regionalizedBaseline ? 'baseline' : 'regionalized_baseline',
  }
}

function getBaselineIngredientPrice(ingredientName: string): number {
  const baselineCatalog: Array<{ keywords: string[]; price: number }> = [
    { keywords: ['egg'], price: 3.5 },
    { keywords: ['milk'], price: 3.9 },
    { keywords: ['bread'], price: 3.2 },
    { keywords: ['rice'], price: 2.8 },
    { keywords: ['chicken'], price: 5.6 },
    { keywords: ['beef'], price: 7.4 },
    { keywords: ['tomato'], price: 2.6 },
    { keywords: ['onion'], price: 1.8 },
    { keywords: ['cheese'], price: 4.3 },
    { keywords: ['pasta'], price: 2.2 },
    { keywords: ['beans'], price: 1.9 },
    { keywords: ['lettuce'], price: 2.5 },
  ]

  const match = baselineCatalog.find((entry) => entry.keywords.some((keyword) => ingredientName.includes(keyword)))
  if (match) return match.price
  return 3.5
}

async function applyStoreRegionalMultiplier(baselinePrice: number, storeId: string): Promise<number> {
  const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 180)
  const [storeAggregate, marketAggregate] = await Promise.all([
    prisma.priceObservation.aggregate({
      _avg: { price: true },
      where: { storeId, scannedAt: { gte: since } },
    }),
    prisma.priceObservation.aggregate({
      _avg: { price: true },
      where: { scannedAt: { gte: since } },
    }),
  ])

  const storeAvg = storeAggregate._avg.price
  const marketAvg = marketAggregate._avg.price
  if (!storeAvg || !marketAvg || marketAvg <= 0) return baselinePrice

  const multiplier = Math.min(1.4, Math.max(0.7, storeAvg / marketAvg))
  return baselinePrice * multiplier
}

function getTotalCost(items: StoreItemResult[]): number {
  return roundCurrency(items.reduce((sum, item) => sum + item.price, 0))
}

function getKnownSubtotal(items: StoreItemResult[]): number {
  return roundCurrency(items.filter((item) => item.available).reduce((sum, item) => sum + item.price, 0))
}

function getEstimatedSubtotal(items: StoreItemResult[]): number {
  return roundCurrency(items.filter((item) => !item.available).reduce((sum, item) => sum + item.price, 0))
}

function getCoveragePct(items: StoreItemResult[]): number {
  if (items.length === 0) return 0
  const knownCount = items.filter((item) => item.available).length
  return Math.round((knownCount / items.length) * 100)
}

function getConfidencePct(coveragePct: number): number {
  const base = 35
  return Math.round(base + ((100 - base) * coveragePct) / 100)
}

export function computeBestSplitOption(
  storeResults: StoreScanResult[]
): PriceScanResult['bestSplitOption'] {
  if (storeResults.length < 2) return null

  const bestSingleStore = [...storeResults].sort((a, b) => a.totalCost - b.totalCost)[0]
  const splitStores = storeResults.map((store) => ({
    ...store,
    subtotal: 0,
    assignedItems: [] as string[],
  }))

  const ingredientNames = Array.from(
    new Set(storeResults.flatMap((store) => store.items.map((item) => item.ingredient)))
  )

  for (const ingredientName of ingredientNames) {
    const candidates = splitStores
      .map((store) => ({
        store,
        item: store.items.find((candidate) => candidate.ingredient === ingredientName),
      }))
      .filter(
        (entry): entry is { store: SplitStoreResult; item: StoreItemResult } =>
          Boolean(entry.item?.available)
      )
      .sort((a, b) => a.item.price - b.item.price)

    if (candidates.length === 0) continue

    const winner = candidates[0]
    winner.store.subtotal = roundCurrency(winner.store.subtotal + winner.item.price)
    winner.store.assignedItems.push(ingredientName)
  }

  const activeStores = splitStores.filter((store) => store.assignedItems.length > 0)
  if (activeStores.length < 2) return null

  const splitTotal = roundCurrency(activeStores.reduce((sum, store) => sum + store.subtotal, 0))
  const savings = roundCurrency(bestSingleStore.totalCost - splitTotal)

  if (savings < SPLIT_THRESHOLD) return null

  return {
    totalCost: splitTotal,
    savings,
    worthSplitting: true,
    stores: activeStores,
  }
}

export async function scanPrices(input: {
  recipeId: string
  ingredients: RecipeIngredient[]
  stores: ScanStore[]
  maxStores: number
}): Promise<PriceScanResult> {
  const scopedStores = input.stores.slice(0, Math.max(input.maxStores, 1))
  const cacheKey = getCacheKey(input.recipeId, scopedStores)

  try {
    const cached = await redis.get(cacheKey)
    if (cached) {
      return {
        ...(JSON.parse(cached) as Omit<PriceScanResult, 'cached'>),
        cached: true,
      }
    }
  } catch {
    // Best-effort cache; continue on miss or Redis failure.
  }

  const storeResults = await Promise.all(
    scopedStores.map(async (store) => {
      const items = await Promise.all(
        input.ingredients.map((ingredient) => getIngredientPrice(ingredient, store))
      )

      return {
        storeId: store.storeId,
        storeName: store.storeName,
        distanceMiles: store.distanceMiles,
        totalCost: getTotalCost(items),
        items,
      }
    })
  )

  const availableStores = storeResults.filter((store) => store.items.some((item) => item.available))
  const rankedStores = [...availableStores].sort((a, b) => a.totalCost - b.totalCost)

  if (rankedStores.length === 0) {
    const fallbackStore = [...storeResults].sort((a, b) => a.distanceMiles - b.distanceMiles)[0]

    const result: PriceScanResult = {
      bestSingleStore: fallbackStore,
      bestSplitOption: null,
      storeResults,
      cached: false,
      hasAnyPrices: false,
      knownSubtotal: 0,
      estimatedSubtotal: getEstimatedSubtotal(fallbackStore.items),
      coveragePct: 0,
      confidencePct: getConfidencePct(0),
      missingIngredients: fallbackStore.items.map((item) => item.ingredient),
      message: 'Community pricing is still sparse for this recipe. These totals are estimate-first and will improve as more scans come in.',
    }

    try {
      await redis.set(
        cacheKey,
        JSON.stringify(result),
        'EX',
        PRICE_CACHE_TTL_SECONDS
      )
    } catch {
      // Cache write failure is non-fatal.
    }

    return result
  }

  const result: PriceScanResult = {
    bestSingleStore: rankedStores[0],
    bestSplitOption: computeBestSplitOption(rankedStores),
    storeResults: rankedStores,
    cached: false,
    hasAnyPrices: true,
    knownSubtotal: getKnownSubtotal(rankedStores[0].items),
    estimatedSubtotal: getEstimatedSubtotal(rankedStores[0].items),
    coveragePct: getCoveragePct(rankedStores[0].items),
    confidencePct: getConfidencePct(getCoveragePct(rankedStores[0].items)),
    missingIngredients: rankedStores[0].items.filter((item) => !item.available).map((item) => item.ingredient),
  }

  try {
    await redis.set(
      cacheKey,
      JSON.stringify({
        bestSingleStore: result.bestSingleStore,
        bestSplitOption: result.bestSplitOption,
        storeResults: result.storeResults,
        hasAnyPrices: result.hasAnyPrices,
        knownSubtotal: result.knownSubtotal,
        estimatedSubtotal: result.estimatedSubtotal,
        coveragePct: result.coveragePct,
        confidencePct: result.confidencePct,
        missingIngredients: result.missingIngredients,
        message: result.message,
      }),
      'EX',
      PRICE_CACHE_TTL_SECONDS
    )
  } catch {
    // Cache write failure is non-fatal.
  }

  return result
}

export function getUserScanStores(profile: {
  preferredRetailers: string[]
  selectedStores?: unknown
  maxStores?: number
}): ScanStore[] {
  const selectedStores = normalizeSelectedStores(profile.selectedStores)

  if (selectedStores.length > 0) {
    return selectedStores.map((store) => ({
      storeId: store.id,
      storeName: store.name,
      chain: store.chain,
      distanceMiles: roundCurrency(store.distanceMiles),
    }))
  }

  return profile.preferredRetailers.map((chain, index) => {
    const seed = TX_STORE_SEED.find((candidate) => candidate.chain === chain)

    return {
      storeId: chain,
      storeName: seed?.name ?? chain,
      chain,
      distanceMiles: roundCurrency(index * 1.4 + 0.8),
    }
  })
}

export async function buildShoppingList(userId: string, planId: string) {
  const [plan, profile] = await Promise.all([
    prisma.mealPlan.findFirst({
      where: { id: planId, userId },
      include: {
        meals: {
          include: {
            recipe: true,
          },
          orderBy: [{ dayOfWeek: 'asc' }],
        },
      },
    }),
    prisma.userProfile.findUnique({
      where: { userId },
      select: { preferredRetailers: true, selectedStores: true, maxStores: true },
    }),
  ])

  if (!plan) {
    throw new Error('Meal plan not found')
  }

  const scanStores =
    profile && profile.preferredRetailers.length > 0
      ? getUserScanStores(profile).slice(0, Math.max(profile.maxStores ?? 1, 1))
      : []

  const mealsWithAssignedStores = await Promise.all(
    plan.meals.map(async (meal) => {
      if (meal.bestStore || scanStores.length === 0) return meal

      const result = await scanPrices({
        recipeId: meal.recipe.id,
        ingredients: normalizeIngredients(meal.recipe.ingredients),
        stores: scanStores,
        maxStores: Math.max(profile?.maxStores ?? 1, 1),
      })

      if (result.hasAnyPrices) {
        await persistBestStore(meal.id, result.bestSingleStore.storeName)
        return {
          ...meal,
          bestStore: result.bestSingleStore.storeName,
        }
      }

      return meal
    })
  )

  // Collect all unique ingredient names across all meals
  const allIngredientNames = new Set<string>()
  for (const meal of mealsWithAssignedStores) {
    for (const ing of normalizeIngredients(meal.recipe.ingredients)) {
      allIngredientNames.add(ing.name.toLowerCase())
    }
  }

  // Fetch most recent purchase for each ingredient in one query
  const purchaseHistoryRows = await prisma.purchaseHistory.findMany({
    where: {
      userId,
      itemName: { in: [...allIngredientNames] },
    },
    orderBy: { purchasedAt: 'desc' },
  })

  // Build a map: lowercase ingredient name → most recent purchase
  const lastPurchaseMap = new Map<string, typeof purchaseHistoryRows[0]>()
  for (const row of purchaseHistoryRows) {
    const key = row.itemName.toLowerCase()
    if (!lastPurchaseMap.has(key)) {
      lastPurchaseMap.set(key, row)
    }
  }

  const grouped = new Map<
    string,
    Map<string, { key: string; ingredient: string; amount: number; unit: string; checked: false; lastPurchase: object | null }>
  >()

  for (const meal of mealsWithAssignedStores) {
    const storeName = meal.bestStore || 'Best store pending'
    if (!grouped.has(storeName)) {
      grouped.set(storeName, new Map())
    }

    for (const ingredient of normalizeIngredients(meal.recipe.ingredients)) {
      const key = `${ingredient.name.toLowerCase()}|${ingredient.unit}|${storeName}`
      const storeItems = grouped.get(storeName)!
      const current = storeItems.get(key)
      const lastPurchase = lastPurchaseMap.get(ingredient.name.toLowerCase()) ?? null

      storeItems.set(key, {
        key,
        ingredient: ingredient.name,
        amount: roundCurrency((current?.amount ?? 0) + ingredient.amount),
        unit: ingredient.unit,
        checked: false,
        lastPurchase,
      })
    }
  }

  const stores = [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([storeName, items]) => ({
      storeName,
      items: [...items.values()].sort((a, b) => a.ingredient.localeCompare(b.ingredient)),
    }))

  return {
    planId,
    stores,
    totalItems: stores.reduce((sum, store) => sum + store.items.length, 0),
  }
}

export async function getRecipeForPlan(userId: string, planId: string, recipeId: string) {
  const plan = await prisma.mealPlan.findFirst({
    where: { id: planId, userId },
    include: {
      meals: {
        include: { recipe: true },
      },
    },
  })

  if (!plan) return null

  const meal = plan.meals.find((candidate) => candidate.recipe.id === recipeId)

  if (!meal) return null

  return {
    ...meal,
    recipe: {
      ...meal.recipe,
      ingredients: normalizeIngredients(meal.recipe.ingredients),
    },
  }
}

export async function persistBestStore(mealId: string, storeName: string) {
  await prisma.meal.update({
    where: { id: mealId },
    data: { bestStore: storeName },
  })
}
