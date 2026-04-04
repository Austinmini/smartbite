import '../../test/mocks/prisma'

jest.mock('../../lib/redis', () => ({
  redis: {
    get: jest.fn(),
    set: jest.fn(),
    expire: jest.fn(),
  },
}))

jest.mock('../../lib/mealme', () => ({
  queryMealMe: jest.fn(),
}))

jest.mock('../../lib/kroger', () => ({
  queryKrogerProduct: jest.fn(),
}))

import { redis } from '../../lib/redis'
import { prisma } from '../../lib/prisma'
import { queryMealMe } from '../../lib/mealme'
import { queryKrogerProduct } from '../../lib/kroger'
import {
  SPLIT_THRESHOLD,
  buildShoppingList,
  computeBestSplitOption,
  getUserScanStores,
  scanPrices,
  type ScanStore,
} from '../pricingService'

const redisMock = redis as any
const prismaMock = prisma as any
const mealMeMock = queryMealMe as jest.Mock
const krogerMock = queryKrogerProduct as jest.Mock

const stores: ScanStore[] = [
  { storeId: 'heb-1', storeName: 'HEB', chain: 'heb', distanceMiles: 1.2 },
  { storeId: 'kroger-1', storeName: 'Kroger', chain: 'kroger', distanceMiles: 2.1 },
]

const ingredients = [
  { name: 'chicken breast', amount: 1, unit: 'lb' },
  { name: 'rice', amount: 1, unit: 'bag' },
]

beforeEach(() => {
  jest.clearAllMocks()
  redisMock.get.mockResolvedValue(null)
  redisMock.set.mockResolvedValue('OK')
  mealMeMock.mockResolvedValue(null)
  krogerMock.mockResolvedValue(null)
})

describe('scanPrices service', () => {
  it('returns bestSingleStore with lowest total cost', async () => {
    mealMeMock.mockImplementation(async ({ ingredient, store }: any) => {
      const prices: Record<string, Record<string, number>> = {
        'HEB': { 'chicken breast': 7.25, rice: 2.5 },
        'Kroger': { 'chicken breast': 6.0, rice: 4.0 },
      }

      const price = prices[store.storeName]?.[ingredient.name]
      return price ? { price, unit: ingredient.unit, available: true, source: 'api' } : null
    })

    const result = await scanPrices({
      recipeId: 'recipe-1',
      ingredients,
      stores,
      maxStores: 2,
    })

    expect(result.bestSingleStore.storeName).toBe('HEB')
    expect(result.bestSingleStore.totalCost).toBe(9.75)
    expect(result.bestSplitOption).toBeNull()
  })

  it('computes bestSplitOption when savings >= $3', async () => {
    mealMeMock.mockImplementation(async ({ ingredient, store }: any) => {
      const prices: Record<string, Record<string, number>> = {
        'HEB': { 'chicken breast': 9.0, rice: 5.0 },
        'Kroger': { 'chicken breast': 4.5, rice: 8.5 },
      }

      const price = prices[store.storeName]?.[ingredient.name]
      return price ? { price, unit: ingredient.unit, available: true, source: 'api' } : null
    })

    const result = await scanPrices({
      recipeId: 'recipe-2',
      ingredients,
      stores,
      maxStores: 2,
    })

    expect(result.bestSingleStore.storeName).toBe('Kroger')
    expect(result.bestSingleStore.totalCost).toBe(13)
    expect(result.bestSplitOption).not.toBeNull()
    expect(result.bestSplitOption?.worthSplitting).toBe(true)
    expect(result.bestSplitOption?.totalCost).toBe(9.5)
    expect(result.bestSplitOption?.savings).toBeGreaterThanOrEqual(SPLIT_THRESHOLD)
  })

  it('returns null for bestSplitOption when savings < $3', async () => {
    mealMeMock.mockImplementation(async ({ ingredient, store }: any) => {
      const prices: Record<string, Record<string, number>> = {
        'HEB': { 'chicken breast': 7.0, rice: 3.5 },
        'Kroger': { 'chicken breast': 6.5, rice: 4.0 },
      }

      const price = prices[store.storeName]?.[ingredient.name]
      return price ? { price, unit: ingredient.unit, available: true, source: 'api' } : null
    })

    const result = await scanPrices({
      recipeId: 'recipe-3',
      ingredients,
      stores,
      maxStores: 2,
    })

    expect(result.bestSingleStore.totalCost).toBe(10.5)
    expect(result.bestSplitOption).toBeNull()
  })

  it('respects storesPerScan tier limit', async () => {
    mealMeMock.mockResolvedValue({ price: 5, unit: 'item', available: true, source: 'api' })

    const result = await scanPrices({
      recipeId: 'recipe-4',
      ingredients,
      stores,
      maxStores: 1,
    })

    expect(result.storeResults).toHaveLength(1)
    expect(result.bestSingleStore.storeName).toBe('HEB')
  })

  it('serves cached result within 1hr TTL', async () => {
    redisMock.get.mockResolvedValue(
      JSON.stringify({
        bestSingleStore: { storeId: 'heb-1', storeName: 'HEB', totalCost: 9.25, distanceMiles: 1.2, items: [] },
        bestSplitOption: null,
        storeResults: [],
        cached: true,
      })
    )

    const result = await scanPrices({
      recipeId: 'recipe-5',
      ingredients,
      stores,
      maxStores: 2,
    })

    expect(result.cached).toBe(true)
    expect(mealMeMock).not.toHaveBeenCalled()
    expect(result.bestSingleStore.totalCost).toBe(9.25)
  })

  it('falls back to Kroger API when MealMe returns empty', async () => {
    mealMeMock.mockImplementation(async ({ store }: any) => {
      if (store.chain === 'kroger') return null
      return { price: 8, unit: 'item', available: true, source: 'api' }
    })
    krogerMock.mockResolvedValue({ price: 3.25, unit: 'item', available: true, source: 'api' })

    const result = await scanPrices({
      recipeId: 'recipe-6',
      ingredients: [{ name: 'milk', amount: 1, unit: 'gallon' }],
      stores,
      maxStores: 2,
    })

    expect(krogerMock).toHaveBeenCalled()
    expect(result.bestSingleStore.storeName).toBe('Kroger')
    expect(result.bestSingleStore.totalCost).toBe(3.25)
  })

  it('returns an unavailable fallback result instead of throwing when no stores have prices', async () => {
    mealMeMock.mockResolvedValue(null)
    krogerMock.mockResolvedValue(null)

    const result = await scanPrices({
      recipeId: 'recipe-7',
      ingredients,
      stores,
      maxStores: 2,
    })

    expect(result.hasAnyPrices).toBe(false)
    expect(result.bestSplitOption).toBeNull()
    expect(result.storeResults).toHaveLength(2)
    expect(result.storeResults.every((store) => store.items.every((item) => item.available === false))).toBe(true)
    expect(result.message).toMatch(/no live price data/i)
  })
})

describe('split optimizer', () => {
  it('assigns each ingredient to its cheaper store', () => {
    const split = computeBestSplitOption([
      {
        storeId: 'heb-1',
        storeName: 'HEB',
        distanceMiles: 1.2,
        totalCost: 12,
        items: [
          { ingredient: 'chicken breast', price: 7, unit: 'lb', available: true, source: 'api' },
          { ingredient: 'rice', price: 2, unit: 'bag', available: true, source: 'api' },
        ],
      },
      {
        storeId: 'kroger-1',
        storeName: 'Kroger',
        distanceMiles: 2.1,
        totalCost: 13,
        items: [
          { ingredient: 'chicken breast', price: 4, unit: 'lb', available: true, source: 'api' },
          { ingredient: 'rice', price: 9, unit: 'bag', available: true, source: 'api' },
        ],
      },
    ])

    expect(split?.stores[0].assignedItems).toEqual(['rice'])
    expect(split?.stores[1].assignedItems).toEqual(['chicken breast'])
  })

  it('correctly computes per-store subtotals', () => {
    const split = computeBestSplitOption([
      {
        storeId: 'heb-1',
        storeName: 'HEB',
        distanceMiles: 1.2,
        totalCost: 14,
        items: [
          { ingredient: 'beans', price: 2.5, unit: 'can', available: true, source: 'api' },
          { ingredient: 'rice', price: 4.5, unit: 'bag', available: true, source: 'api' },
        ],
      },
      {
        storeId: 'aldi-1',
        storeName: 'Aldi',
        distanceMiles: 3.4,
        totalCost: 13,
        items: [
          { ingredient: 'beans', price: 4.5, unit: 'can', available: true, source: 'api' },
          { ingredient: 'rice', price: 2.0, unit: 'bag', available: true, source: 'api' },
        ],
      },
    ])

    expect(split?.stores.find((store: { storeName: string }) => store.storeName === 'HEB')?.subtotal).toBe(2.5)
    expect(split?.stores.find((store: { storeName: string }) => store.storeName === 'Aldi')?.subtotal).toBe(2)
    expect(split?.totalCost).toBe(4.5)
  })

  it('only surfaces split when saving >= SPLIT_THRESHOLD', () => {
    const split = computeBestSplitOption([
      {
        storeId: 'heb-1',
        storeName: 'HEB',
        distanceMiles: 1.2,
        totalCost: 10,
        items: [{ ingredient: 'rice', price: 5, unit: 'bag', available: true, source: 'api' }],
      },
      {
        storeId: 'kroger-1',
        storeName: 'Kroger',
        distanceMiles: 2.1,
        totalCost: 8,
        items: [{ ingredient: 'rice', price: 4.75, unit: 'bag', available: true, source: 'api' }],
      },
    ])

    expect(split).toBeNull()
  })
})

describe('getUserScanStores', () => {
  it('prefers persisted selected store records over seed chain placeholders', () => {
    const stores = getUserScanStores({
      preferredRetailers: ['heb', 'walmart'],
      selectedStores: [
        {
          id: 'mealme-store-123',
          name: 'HEB Mueller',
          chain: 'heb',
          distanceMiles: 1.1,
          address: '1801 E 51st St',
          lat: 30.30,
          lng: -97.70,
        },
        {
          id: 'mealme-store-456',
          name: 'Walmart Supercenter',
          chain: 'walmart',
          distanceMiles: 2.6,
          address: '710 E Ben White Blvd',
          lat: 30.22,
          lng: -97.75,
        },
      ],
    })

    expect(stores).toEqual([
      {
        storeId: 'mealme-store-123',
        storeName: 'HEB Mueller',
        chain: 'heb',
        distanceMiles: 1.1,
      },
      {
        storeId: 'mealme-store-456',
        storeName: 'Walmart Supercenter',
        chain: 'walmart',
        distanceMiles: 2.6,
      },
    ])
  })
})

describe('buildShoppingList', () => {
  it('backfills missing meal bestStore assignments before grouping the shopping list', async () => {
    prismaMock.mealPlan.findFirst.mockResolvedValue({
      id: 'plan-1',
      userId: 'user-1',
      meals: [
        {
          id: 'meal-1',
          bestStore: '',
          recipe: {
            ingredients: [{ name: 'rice', amount: 1, unit: 'bag' }],
          },
        },
        {
          id: 'meal-2',
          bestStore: '',
          recipe: {
            ingredients: [{ name: 'beans', amount: 2, unit: 'can' }],
          },
        },
      ],
    })
    prismaMock.userProfile.findUnique.mockResolvedValue({
      userId: 'user-1',
      preferredRetailers: ['heb', 'walmart'],
      selectedStores: [
        {
          id: 'store-heb-1',
          name: 'HEB South Congress',
          chain: 'heb',
          distanceMiles: 0.8,
          address: '123 S Congress Ave',
          lat: 30.25,
          lng: -97.75,
        },
        {
          id: 'store-walmart-1',
          name: 'Walmart Supercenter',
          chain: 'walmart',
          distanceMiles: 1.4,
          address: '456 Ben White Blvd',
          lat: 30.23,
          lng: -97.78,
        },
      ],
      maxStores: 2,
    })
    mealMeMock.mockImplementation(async ({ ingredient, store }: any) => {
      const prices: Record<string, Record<string, number>> = {
        'HEB South Congress': { rice: 2.25, beans: 4.5 },
        'Walmart Supercenter': { rice: 3.5, beans: 2.75 },
      }

      const price = prices[store.storeName]?.[ingredient.name]
      return price ? { price, unit: ingredient.unit, available: true, source: 'api' } : null
    })

    const result = await buildShoppingList('user-1', 'plan-1')

    expect(prismaMock.meal.update).toHaveBeenCalledWith({
      where: { id: 'meal-1' },
      data: { bestStore: 'HEB South Congress' },
    })
    expect(prismaMock.meal.update).toHaveBeenCalledWith({
      where: { id: 'meal-2' },
      data: { bestStore: 'Walmart Supercenter' },
    })
    expect(result.stores).toEqual([
      {
        storeName: 'HEB South Congress',
        items: [{ key: 'rice|bag|HEB South Congress', ingredient: 'rice', amount: 1, unit: 'bag', checked: false }],
      },
      {
        storeName: 'Walmart Supercenter',
        items: [{ key: 'beans|can|Walmart Supercenter', ingredient: 'beans', amount: 2, unit: 'can', checked: false }],
      },
    ])
  })
})
