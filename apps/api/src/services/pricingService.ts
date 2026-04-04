import { TX_STORE_SEED } from '../data/txStores'
import { queryKrogerProduct } from '../lib/kroger'
import { queryMealMe } from '../lib/mealme'
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
  source: 'api' | 'estimate'
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
  const mealMeResult = await queryMealMe({ ingredient, store })
  if (mealMeResult) {
    return {
      ingredient: ingredient.name,
      price: roundCurrency(mealMeResult.price),
      unit: mealMeResult.unit,
      available: true,
      source: 'api',
    }
  }

  if (store.chain === 'kroger') {
    const krogerResult = await queryKrogerProduct({ ingredient, store })
    if (krogerResult) {
      return {
        ingredient: ingredient.name,
        price: roundCurrency(krogerResult.price),
        unit: krogerResult.unit,
        available: true,
        source: 'api',
      }
    }
  }

  return {
    ingredient: ingredient.name,
    price: 0,
    unit: ingredient.unit,
    available: false,
    source: 'estimate',
  }
}

function getTotalCost(items: StoreItemResult[]): number {
  return roundCurrency(items.reduce((sum, item) => sum + item.price, 0))
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
      message: 'No live price data is available right now. Showing your selected stores so you can still compare availability.',
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
  }

  try {
    await redis.set(
      cacheKey,
      JSON.stringify({
        bestSingleStore: result.bestSingleStore,
        bestSplitOption: result.bestSplitOption,
        storeResults: result.storeResults,
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

  const grouped = new Map<
    string,
    Map<string, { key: string; ingredient: string; amount: number; unit: string; checked: false }>
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

      storeItems.set(key, {
        key,
        ingredient: ingredient.name,
        amount: roundCurrency((current?.amount ?? 0) + ingredient.amount),
        unit: ingredient.unit,
        checked: false,
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
