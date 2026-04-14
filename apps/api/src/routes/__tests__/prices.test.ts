import '../../test/mocks/prisma'
import '../../test/mocks/supabase'

jest.mock('../../services/pricingService', () => {
  const actual = jest.requireActual('../../services/pricingService')
  return {
    ...actual,
    scanPrices: jest.fn(),
    buildShoppingList: jest.fn(),
    persistBestStore: jest.fn(),
  }
})

import { buildApp } from '../../app'
import { prisma } from '../../lib/prisma'
import { createAuthToken } from '../../test/factories'
import * as pricingService from '../../services/pricingService'

const prismaMock = prisma as any
const pricingMock = pricingService as jest.Mocked<typeof pricingService>

let app: Awaited<ReturnType<typeof buildApp>>

beforeAll(async () => {
  app = await buildApp()
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

beforeEach(() => {
  jest.clearAllMocks()
})

const authHeaders = () => ({ Authorization: `Bearer ${createAuthToken('user-1')}` })

describe('GET /prices/scan', () => {
  it('returns best single store and split option for a recipe in the plan', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', tier: 'PLUS' })
    prismaMock.userProfile.findUnique.mockResolvedValue({
      userId: 'user-1',
      preferredRetailers: ['heb', 'kroger'],
      maxStores: 2,
      location: { lat: 30.27, lng: -97.74 },
    })
    prismaMock.mealPlan.findFirst.mockResolvedValue({
      id: 'plan-1',
      userId: 'user-1',
      meals: [
        {
          id: 'meal-1',
          recipe: {
            id: 'recipe-1',
            title: 'Chicken and Rice',
            ingredients: [
              { name: 'chicken breast', amount: 1, unit: 'lb' },
              { name: 'rice', amount: 1, unit: 'bag' },
            ],
          },
        },
      ],
    })
    pricingMock.scanPrices.mockResolvedValue({
      bestSingleStore: { storeId: 'heb', storeName: 'HEB', totalCost: 10.5, distanceMiles: 1.2, items: [] },
      bestSplitOption: null,
      storeResults: [],
      cached: false,
    } as any)

    const res = await app.inject({
      method: 'GET',
      url: '/prices/scan?recipeId=recipe-1&planId=plan-1',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(200)
    expect(pricingMock.scanPrices).toHaveBeenCalled()
    expect(res.json().bestSingleStore.storeName).toBe('HEB')
  })

  it('returns 403 when free user requests more than one store scan', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', tier: 'FREE' })
    prismaMock.userProfile.findUnique.mockResolvedValue({
      userId: 'user-1',
      preferredRetailers: ['heb', 'kroger'],
      maxStores: 2,
      location: { lat: 30.27, lng: -97.74 },
    })

    const res = await app.inject({
      method: 'GET',
      url: '/prices/scan?recipeId=recipe-1&planId=plan-1',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(403)
    expect(res.json().error).toMatch(/store/i)
  })

  it('returns 400 when recipeId or planId is missing', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/prices/scan?recipeId=recipe-1',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(400)
  })

  it('returns a graceful fallback payload when no store has live prices', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', tier: 'PLUS' })
    prismaMock.userProfile.findUnique.mockResolvedValue({
      userId: 'user-1',
      preferredRetailers: ['heb', 'kroger'],
      maxStores: 2,
    })
    prismaMock.mealPlan.findFirst.mockResolvedValue({
      id: 'plan-1',
      userId: 'user-1',
      meals: [
        {
          id: 'meal-1',
          recipe: {
            id: 'recipe-1',
            title: 'Chicken and Rice',
            ingredients: [
              { name: 'chicken breast', amount: 1, unit: 'lb' },
              { name: 'rice', amount: 1, unit: 'bag' },
            ],
          },
        },
      ],
    })
    pricingMock.scanPrices.mockResolvedValue({
      bestSingleStore: {
        storeId: 'heb',
        storeName: 'HEB',
        totalCost: 0,
        distanceMiles: 1.2,
        items: [
          { ingredient: 'chicken breast', price: 0, unit: 'lb', available: false, source: 'estimate' },
        ],
      },
      bestSplitOption: null,
      storeResults: [],
      cached: false,
      hasAnyPrices: false,
      message: 'No live price data is available right now.',
    } as any)

    const res = await app.inject({
      method: 'GET',
      url: '/prices/scan?recipeId=recipe-1&planId=plan-1',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().hasAnyPrices).toBe(false)
    expect(pricingMock.persistBestStore).not.toHaveBeenCalled()
  })
})

describe('GET /shopping-list/:planId', () => {
  it('returns merged ingredients grouped by store', async () => {
    pricingMock.buildShoppingList.mockResolvedValue({
      planId: 'plan-1',
      stores: [
        {
          storeName: 'HEB',
          items: [
            { key: 'rice|bag|HEB', ingredient: 'rice', amount: 2, unit: 'bag', checked: false },
          ],
        },
      ],
      totalItems: 1,
    } as any)

    const res = await app.inject({
      method: 'GET',
      url: '/prices/shopping-list/plan-1',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().stores[0].storeName).toBe('HEB')
    expect(pricingMock.buildShoppingList).toHaveBeenCalledWith('user-1', 'plan-1', undefined)
  })

  it('filters to single recipe when recipeId provided', async () => {
    pricingMock.buildShoppingList.mockResolvedValue({
      planId: 'plan-1',
      stores: [
        {
          storeName: 'HEB',
          items: [
            { key: 'rice|bag|HEB', ingredient: 'rice', amount: 1, unit: 'bag', checked: false },
          ],
        },
      ],
      totalItems: 1,
    } as any)

    const res = await app.inject({
      method: 'GET',
      url: '/prices/shopping-list/plan-1?recipeId=recipe-1',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(200)
    expect(pricingMock.buildShoppingList).toHaveBeenCalledWith('user-1', 'plan-1', 'recipe-1')
  })

  it('returns 401 without auth', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/prices/shopping-list/plan-1',
    })

    expect(res.statusCode).toBe(401)
  })
})
