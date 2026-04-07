import '../../test/mocks/prisma'
import '../../test/mocks/supabase'
import { buildApp } from '../../app'
import { prisma } from '../../lib/prisma'
import { createAuthToken } from '../../test/factories'

const prismaMock = prisma as any

let app: Awaited<ReturnType<typeof buildApp>>

beforeAll(async () => {
  app = await buildApp()
  await app.ready()
})
afterAll(async () => { await app.close() })
beforeEach(() => { jest.clearAllMocks() })

const authHeaders = () => ({ Authorization: `Bearer ${createAuthToken('user-1')}` })

const VALID_PROFILE = {
  weeklyBudget: 120,
  location: { zip: '78701', lat: 30.27, lng: -97.74, city: 'Austin' },
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
  dietaryGoals: ['high-protein'],
  allergies: [],
  cuisinePrefs: ['Mexican'],
  cookingTimeMax: 30,
  servings: 2,
}

// ─── GET /profile ─────────────────────────────────────────────────────────────

describe('GET /profile', () => {
  it('returns profile for authenticated user', async () => {
    prismaMock.userProfile.findUnique.mockResolvedValue({
      ...VALID_PROFILE,
      id: 'p-1',
      userId: 'user-1',
      completedActions: ['GENERATED_PLAN'],
    })

    const res = await app.inject({ method: 'GET', url: '/profile', headers: authHeaders() })

    expect(res.statusCode).toBe(200)
    expect(res.json().profile).toMatchObject({ weeklyBudget: 120 })
    expect(res.json().profile.completedActions).toContain('first_plan_generated')
  })

  it('returns 404 when profile not yet created', async () => {
    prismaMock.userProfile.findUnique.mockResolvedValue(null)

    const res = await app.inject({ method: 'GET', url: '/profile', headers: authHeaders() })

    expect(res.statusCode).toBe(404)
  })

  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/profile' })
    expect(res.statusCode).toBe(401)
  })
})

describe('GET /profile/checklist', () => {
  it('returns normalized checklist progress with inferred completed items', async () => {
    prismaMock.userProfile.findUnique.mockResolvedValue({
      completedActions: ['MARKED_RECIPE_COOKED'],
      scanCount: 1,
    })
    prismaMock.mealPlan.findFirst.mockResolvedValue({ id: 'plan-1' })
    prismaMock.purchaseHistory.findFirst.mockResolvedValue({ id: 'purchase-1' })

    const res = await app.inject({ method: 'GET', url: '/profile/checklist', headers: authHeaders() })

    expect(res.statusCode).toBe(200)
    expect(res.json().completedActions).toEqual(expect.arrayContaining([
      'profile_complete',
      'first_plan_generated',
      'first_scan',
      'first_purchase',
      'first_recipe_cooked',
    ]))
  })
})

// ─── PUT /profile ─────────────────────────────────────────────────────────────

describe('PUT /profile', () => {
  it('creates profile when none exists', async () => {
    prismaMock.userProfile.upsert.mockResolvedValue({ ...VALID_PROFILE, id: 'p-1', userId: 'user-1' })

    const res = await app.inject({ method: 'PUT', url: '/profile', headers: authHeaders(), payload: VALID_PROFILE })

    expect(res.statusCode).toBe(200)
    expect(res.json().profile).toMatchObject({ weeklyBudget: 120 })
    expect(prismaMock.userProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          selectedStores: VALID_PROFILE.selectedStores,
          maxStores: 2,
        }),
        create: expect.objectContaining({
          selectedStores: VALID_PROFILE.selectedStores,
          maxStores: 2,
        }),
      })
    )
  })

  it('rejects more than 2 preferred retailers', async () => {
    const res = await app.inject({
      method: 'PUT', url: '/profile', headers: authHeaders(),
      payload: { ...VALID_PROFILE, preferredRetailers: ['heb', 'walmart', 'kroger'] },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().error).toMatch(/2/)
  })

  it('rejects unsupported chain in preferredRetailers', async () => {
    const res = await app.inject({
      method: 'PUT', url: '/profile', headers: authHeaders(),
      payload: { ...VALID_PROFILE, preferredRetailers: ['heb', 'targetfresh'] },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().error).toMatch(/supported/)
  })

  it('returns 401 without auth', async () => {
    const res = await app.inject({ method: 'PUT', url: '/profile', payload: VALID_PROFILE })
    expect(res.statusCode).toBe(401)
  })

  it('rejects selected stores that do not match preferred retailers', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/profile',
      headers: authHeaders(),
      payload: {
        ...VALID_PROFILE,
        preferredRetailers: ['heb'],
        selectedStores: VALID_PROFILE.selectedStores,
      },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().error).toMatch(/selectedStores/i)
  })
})

// ─── PUT /profile/retailers ───────────────────────────────────────────────────

describe('PUT /profile/retailers', () => {
  it('updates preferred retailers', async () => {
    prismaMock.userProfile.update.mockResolvedValue({ ...VALID_PROFILE, preferredRetailers: ['kroger'] })

    const res = await app.inject({
      method: 'PUT', url: '/profile/retailers', headers: authHeaders(),
      payload: { preferredRetailers: ['kroger'] },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().profile.preferredRetailers).toContain('kroger')
  })

  it('rejects more than 2 retailers', async () => {
    const res = await app.inject({
      method: 'PUT', url: '/profile/retailers', headers: authHeaders(),
      payload: { preferredRetailers: ['heb', 'walmart', 'aldi'] },
    })

    expect(res.statusCode).toBe(400)
  })
})

// ─── PUT /profile/dietary ─────────────────────────────────────────────────────

describe('PUT /profile/dietary', () => {
  it('updates dietary goals and allergies', async () => {
    prismaMock.userProfile.update.mockResolvedValue({
      ...VALID_PROFILE,
      dietaryGoals: ['vegan'],
      allergies: ['gluten'],
    })

    const res = await app.inject({
      method: 'PUT', url: '/profile/dietary', headers: authHeaders(),
      payload: { dietaryGoals: ['vegan'], allergies: ['gluten'] },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().profile.dietaryGoals).toContain('vegan')
  })
})
