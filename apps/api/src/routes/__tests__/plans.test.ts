import '../../test/mocks/prisma'
import '../../test/mocks/supabase'

jest.mock('../../services/mealPlanService', () => ({
  generateMealPlan: jest.fn(),
  saveMealPlan: jest.fn(),
  getCurrentPlan: jest.fn(),
  getPlans: jest.fn(),
  getMeal: jest.fn(),
  regenerateMeal: jest.fn(),
}))

jest.mock('../../lib/redis', () => ({
  redis: {
    get: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
  },
}))

import { buildApp } from '../../app'
import { prisma } from '../../lib/prisma'
import { redis } from '../../lib/redis'
import * as mealPlanService from '../../services/mealPlanService'
import { createAuthToken } from '../../test/factories'

const prismaMock = prisma as any
const redisMock = redis as any
const svcMock = mealPlanService as jest.Mocked<typeof mealPlanService>

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

const mockProfile = {
  id: 'profile-1',
  userId: 'user-1',
  weeklyBudget: 100,
  location: { zip: '78701', lat: 30.27, lng: -97.74, city: 'Austin' },
  preferredRetailers: ['heb', 'walmart'],
  dietaryGoals: ['high-protein'],
  allergies: [],
  cuisinePrefs: ['Mexican'],
  cookingTimeMax: 30,
  servings: 2,
}

const mockPlanData = {
  totalEstCost: 95.5,
  days: [
    {
      dayOfWeek: 0,
      meals: [
        {
          mealType: 'BREAKFAST',
          title: 'Scrambled Eggs',
          estCostPerServing: 2.5,
          readyInMinutes: 10,
          tags: ['high-protein'],
          ingredients: [{ name: 'eggs', amount: 3, unit: 'whole' }],
          instructions: [{ step: 1, text: 'Scramble eggs in a pan' }],
          nutrition: { calories: 300, protein: 20, carbs: 5, fat: 15 },
        },
      ],
    },
  ],
}

const mockSavedPlan = {
  id: 'plan-1',
  userId: 'user-1',
  weekStarting: new Date('2026-03-30'),
  totalEstCost: 95.5,
  createdAt: new Date(),
  meals: [
    {
      id: 'meal-1',
      mealPlanId: 'plan-1',
      dayOfWeek: 0,
      mealType: 'BREAKFAST',
      recipeId: 'recipe-1',
      estCost: 5.0,
      bestStore: '',
      recipe: {
        id: 'recipe-1',
        externalId: null,
        imageUrl: null,
        title: 'Scrambled Eggs',
        source: 'ai_generated',
        readyInMinutes: 10,
        servings: 2,
        ingredients: [{ name: 'eggs', amount: 3, unit: 'whole' }],
        instructions: [{ step: 1, text: 'Scramble eggs in a pan' }],
        nutrition: { calories: 300, protein: 20, carbs: 5, fat: 15 },
        tags: ['high-protein'],
        cuisineType: [],
        diets: [],
        createdAt: new Date(),
      },
    },
  ],
}

// ─── POST /plans/generate ─────────────────────────────────────────────────────

describe('POST /plans/generate', () => {
  it('generates and returns a meal plan for a free user with quota remaining', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', tier: 'FREE' })
    prismaMock.userProfile.findUnique.mockResolvedValue(mockProfile)
    redisMock.get.mockResolvedValue('0')
    svcMock.generateMealPlan.mockResolvedValue(mockPlanData)
    svcMock.saveMealPlan.mockResolvedValue(mockSavedPlan as any)
    redisMock.incr.mockResolvedValue(1)

    const res = await app.inject({
      method: 'POST',
      url: '/plans/generate',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(201)
    expect(res.json().plan.id).toBe('plan-1')
    expect(res.json().plan.totalEstCost).toBe(95.5)
    expect(svcMock.saveMealPlan).toHaveBeenCalledWith('user-1', mockPlanData, 2)
  })

  it('returns 429 when free user has used 2 plans this week', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', tier: 'FREE' })
    redisMock.get.mockResolvedValue('2')

    const res = await app.inject({
      method: 'POST',
      url: '/plans/generate',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(429)
    expect(res.json().error).toMatch(/limit/)
  })

  it('allows a PLUS user to generate beyond 2 plans per week', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', tier: 'PLUS' })
    prismaMock.userProfile.findUnique.mockResolvedValue(mockProfile)
    redisMock.get.mockResolvedValue('5') // 5 plans used — allowed for PLUS (limit 7)
    svcMock.generateMealPlan.mockResolvedValue(mockPlanData)
    svcMock.saveMealPlan.mockResolvedValue(mockSavedPlan as any)
    redisMock.incr.mockResolvedValue(6)

    const res = await app.inject({
      method: 'POST',
      url: '/plans/generate',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(201)
  })

  it('returns 400 when user has no profile', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', tier: 'FREE' })
    redisMock.get.mockResolvedValue('0')
    prismaMock.userProfile.findUnique.mockResolvedValue(null)

    const res = await app.inject({
      method: 'POST',
      url: '/plans/generate',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().error).toMatch(/profile/)
  })

  it('returns 401 without auth token', async () => {
    const res = await app.inject({ method: 'POST', url: '/plans/generate' })
    expect(res.statusCode).toBe(401)
  })

  it('increments the Redis counter on successful generation', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', tier: 'FREE' })
    prismaMock.userProfile.findUnique.mockResolvedValue(mockProfile)
    redisMock.get.mockResolvedValue('0')
    svcMock.generateMealPlan.mockResolvedValue(mockPlanData)
    svcMock.saveMealPlan.mockResolvedValue(mockSavedPlan as any)
    redisMock.incr.mockResolvedValue(1)

    await app.inject({ method: 'POST', url: '/plans/generate', headers: authHeaders() })

    expect(redisMock.incr).toHaveBeenCalledWith(expect.stringContaining('user-1'))
  })
})

// ─── GET /plans/current ───────────────────────────────────────────────────────

describe('GET /plans/current', () => {
  it('returns the current week plan when one exists', async () => {
    svcMock.getCurrentPlan.mockResolvedValue(mockSavedPlan as any)

    const res = await app.inject({
      method: 'GET',
      url: '/plans/current',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().plan.id).toBe('plan-1')
  })

  it('returns 204 when no current plan exists', async () => {
    svcMock.getCurrentPlan.mockResolvedValue(null)

    const res = await app.inject({
      method: 'GET',
      url: '/plans/current',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(204)
  })

  it('returns 401 without auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/plans/current' })
    expect(res.statusCode).toBe(401)
  })
})

// ─── GET /plans ───────────────────────────────────────────────────────────────

describe('GET /plans', () => {
  it('returns paginated plan history', async () => {
    svcMock.getPlans.mockResolvedValue({ plans: [mockSavedPlan], total: 1 } as any)

    const res = await app.inject({
      method: 'GET',
      url: '/plans',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().plans).toHaveLength(1)
    expect(res.json().total).toBe(1)
  })

  it('returns 401 without auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/plans' })
    expect(res.statusCode).toBe(401)
  })
})

// ─── GET /plans/:id/meals/:mealId ─────────────────────────────────────────────

describe('GET /plans/:id/meals/:mealId', () => {
  it('returns meal with recipe data', async () => {
    svcMock.getMeal.mockResolvedValue(mockSavedPlan.meals[0] as any)

    const res = await app.inject({
      method: 'GET',
      url: '/plans/plan-1/meals/meal-1',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().meal.id).toBe('meal-1')
    expect(res.json().meal.recipe.title).toBe('Scrambled Eggs')
  })

  it('returns 404 when meal is not found', async () => {
    svcMock.getMeal.mockResolvedValue(null)

    const res = await app.inject({
      method: 'GET',
      url: '/plans/plan-1/meals/missing',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(404)
  })

  it('returns 401 without auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/plans/plan-1/meals/meal-1' })
    expect(res.statusCode).toBe(401)
  })
})

// ─── POST /plans/:id/regenerate-meal ──────────────────────────────────────────

describe('POST /plans/:id/regenerate-meal', () => {
  it('regenerates a single meal and returns updated meal', async () => {
    prismaMock.userProfile.findUnique.mockResolvedValue(mockProfile)
    svcMock.regenerateMeal.mockResolvedValue({
      meal: mockSavedPlan.meals[0],
      totalEstCost: mockSavedPlan.totalEstCost,
    } as any)

    const res = await app.inject({
      method: 'POST',
      url: '/plans/plan-1/regenerate-meal',
      headers: authHeaders(),
      payload: { mealId: 'meal-1' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().meal.id).toBe('meal-1')
    expect(res.json().totalEstCost).toBe(95.5)
  })

  it('returns 400 when mealId is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/plans/plan-1/regenerate-meal',
      headers: authHeaders(),
      payload: {},
    })

    expect(res.statusCode).toBe(400)
  })

  it('returns 401 without auth', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/plans/plan-1/regenerate-meal',
      payload: { mealId: 'meal-1' },
    })
    expect(res.statusCode).toBe(401)
  })
})
