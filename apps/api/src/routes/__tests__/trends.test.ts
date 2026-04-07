import '../../test/mocks/prisma'
import '../../test/mocks/supabase'

jest.mock('../../services/priceTrendService', () => ({
  getPriceTrend: jest.fn(),
  getAiPriceSuggestion: jest.fn(),
  enrichShoppingListWithTrends: jest.fn(),
}))

import { buildApp } from '../../app'
import { createAuthToken } from '../../test/factories'
import { prisma } from '../../lib/prisma'
import * as trendService from '../../services/priceTrendService'

const prismaMock = prisma as any
const trendMock = trendService as jest.Mocked<typeof trendService>

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

const authHeaders = (userId = 'user-1') => ({
  Authorization: `Bearer ${createAuthToken(userId)}`,
})

// ─── GET /prices/trends ───────────────────────────────────────────────────────

describe('GET /prices/trends', () => {
  it('returns bucketed trend data for a Pro user', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', tier: 'PRO' })
    trendMock.getPriceTrend.mockResolvedValue([
      { week: '2026-W10', avgPrice: 3.0, observationCount: 5 },
      { week: '2026-W11', avgPrice: 3.2, observationCount: 4 },
    ])

    const res = await app.inject({
      method: 'GET',
      url: '/prices/trends?ingredient=chicken+breast&storeId=heb&days=30',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body.trends).toHaveLength(2)
    expect(body.trends[0]).toHaveProperty('week')
    expect(body.trends[0]).toHaveProperty('avgPrice')
  })

  it('returns 403 for a Free user (Pro gate)', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', tier: 'FREE' })

    const res = await app.inject({
      method: 'GET',
      url: '/prices/trends?ingredient=chicken+breast&storeId=heb',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(403)
  })

  it('returns 403 for a Plus user (Pro gate)', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', tier: 'PLUS' })

    const res = await app.inject({
      method: 'GET',
      url: '/prices/trends?ingredient=chicken+breast&storeId=heb',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(403)
  })

  it('returns 400 when ingredient is missing', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', tier: 'PRO' })

    const res = await app.inject({
      method: 'GET',
      url: '/prices/trends?storeId=heb',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(400)
  })

  it('returns 401 without auth', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/prices/trends?ingredient=eggs&storeId=heb',
    })

    expect(res.statusCode).toBe(401)
  })
})

// ─── GET /prices/suggestion ───────────────────────────────────────────────────

describe('GET /prices/suggestion', () => {
  it('returns AI suggestion for a Pro user', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', tier: 'PRO' })
    trendMock.getPriceTrend.mockResolvedValue([
      { week: '2026-W10', avgPrice: 3.0, observationCount: 5 },
      { week: '2026-W11', avgPrice: 3.5, observationCount: 4 },
    ])
    trendMock.getAiPriceSuggestion.mockResolvedValue({
      action: 'buy',
      reasoning: 'Chicken breast is up 16% — buy now before prices rise further.',
      confidence: 'high',
    })

    const res = await app.inject({
      method: 'GET',
      url: '/prices/suggestion?ingredient=chicken+breast&storeId=heb',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body).toHaveProperty('action')
    expect(body).toHaveProperty('reasoning')
    expect(['buy', 'hold', 'substitute']).toContain(body.action)
  })

  it('returns 403 for a Free user (Pro gate)', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', tier: 'FREE' })

    const res = await app.inject({
      method: 'GET',
      url: '/prices/suggestion?ingredient=milk&storeId=heb',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(403)
  })

  it('returns 400 when ingredient is missing', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', tier: 'PRO' })

    const res = await app.inject({
      method: 'GET',
      url: '/prices/suggestion?storeId=heb',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(400)
  })

  it('returns 401 without auth', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/prices/suggestion?ingredient=eggs&storeId=heb',
    })

    expect(res.statusCode).toBe(401)
  })
})
