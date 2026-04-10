import '../../test/mocks/prisma'
import '../../test/mocks/supabase'
import { buildApp } from '../../app'
import * as SentryLib from '../../lib/sentry'
import { prisma } from '../../lib/prisma'
import { createTestUser, createTestProfile, createAuthToken } from '../../test/factories'

jest.mock('../../lib/sentry')

const prismaMock = prisma as jest.Mocked<typeof prisma>

describe('Sentry integration with Fastify', () => {
  let app: any

  beforeAll(async () => {
    process.env.NODE_ENV = 'test'
    app = await buildApp()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('sets user context on authenticated request', async () => {
    const userId = 'test-user-123'
    const mockProfile = {
      id: 'p-1',
      userId,
      weeklyBudget: 100,
      location: { zip: '78701', lat: 30.27, lng: -97.74, city: 'Austin' },
      preferredRetailers: ['heb'],
      dietaryGoals: ['high-protein'],
      allergies: [],
      cookingTimeMax: 30,
      servings: 2,
      completedActions: [],
      scanCount: 0,
      priceContributions: 0,
      contributorScore: 1.0,
    }

    ;(prismaMock.userProfile.findUnique as jest.Mock).mockResolvedValue(mockProfile)

    const token = createAuthToken(userId)

    const response = await app.inject({
      method: 'GET',
      url: '/profile',
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(response.statusCode).toBe(200)
    expect(SentryLib.setSentryUser).toHaveBeenCalledWith(userId)
  })

  it('clears user context after response', async () => {
    const userId = 'test-user-456'
    const mockProfile = {
      id: 'p-2',
      userId,
      weeklyBudget: 100,
      location: { zip: '78701', lat: 30.27, lng: -97.74, city: 'Austin' },
      preferredRetailers: ['walmart'],
      dietaryGoals: ['vegan'],
      allergies: ['nuts'],
      cookingTimeMax: 30,
      servings: 2,
      completedActions: [],
      scanCount: 0,
      priceContributions: 0,
      contributorScore: 1.0,
    }

    ;(prismaMock.userProfile.findUnique as jest.Mock).mockResolvedValue(mockProfile)

    const token = createAuthToken(userId)

    await app.inject({
      method: 'GET',
      url: '/profile',
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    // clearSentryUser is called on onResponse hook
    expect(SentryLib.clearSentryUser).toHaveBeenCalled()
  })

  it('responds to unauthenticated requests without setting user context', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    })

    expect(response.statusCode).toBe(200)
    // setSentryUser should not be called for unauthenticated requests
    // (it's only called in the hook when userId is present)
    expect(SentryLib.setSentryUser).not.toHaveBeenCalled()
  })
})
