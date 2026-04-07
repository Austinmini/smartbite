import '../../test/mocks/prisma'
import '../../test/mocks/supabase'

import { buildApp } from '../../app'
import { createAuthToken } from '../../test/factories'
import { prisma } from '../../lib/prisma'

const prismaMock = prisma as any

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

// ─── POST /prices/alert ───────────────────────────────────────────────────────

describe('POST /prices/alert', () => {
  it('creates a price alert for a Plus user', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', tier: 'PLUS' })
    prismaMock.priceAlert.create.mockResolvedValue({
      id: 'alert-1',
      userId: 'user-1',
      recipeId: 'recipe-1',
      targetPrice: 12.5,
      triggered: false,
    })

    const res = await app.inject({
      method: 'POST',
      url: '/prices/alert',
      headers: authHeaders(),
      payload: { recipeId: 'recipe-1', targetPrice: 12.5 },
    })

    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.payload)
    expect(body).toHaveProperty('id')
    expect(body.targetPrice).toBe(12.5)
  })

  it('creates a price alert for a Pro user', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', tier: 'PRO' })
    prismaMock.priceAlert.create.mockResolvedValue({
      id: 'alert-1',
      userId: 'user-1',
      recipeId: 'recipe-1',
      targetPrice: 15.0,
      triggered: false,
    })

    const res = await app.inject({
      method: 'POST',
      url: '/prices/alert',
      headers: authHeaders(),
      payload: { recipeId: 'recipe-1', targetPrice: 15.0 },
    })

    expect(res.statusCode).toBe(201)
  })

  it('returns 403 for a Free user (Plus/Pro gate)', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', tier: 'FREE' })

    const res = await app.inject({
      method: 'POST',
      url: '/prices/alert',
      headers: authHeaders(),
      payload: { recipeId: 'recipe-1', targetPrice: 10.0 },
    })

    expect(res.statusCode).toBe(403)
  })

  it('returns 400 when recipeId is missing', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', tier: 'PLUS' })

    const res = await app.inject({
      method: 'POST',
      url: '/prices/alert',
      headers: authHeaders(),
      payload: { targetPrice: 10.0 },
    })

    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when targetPrice is negative', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', tier: 'PLUS' })

    const res = await app.inject({
      method: 'POST',
      url: '/prices/alert',
      headers: authHeaders(),
      payload: { recipeId: 'recipe-1', targetPrice: -5 },
    })

    expect(res.statusCode).toBe(400)
  })

  it('returns 401 without auth', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/prices/alert',
      payload: { recipeId: 'recipe-1', targetPrice: 10.0 },
    })

    expect(res.statusCode).toBe(401)
  })
})

// ─── GET /prices/alerts ───────────────────────────────────────────────────────

describe('GET /prices/alerts', () => {
  it('returns list of active alerts for the user', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', tier: 'PLUS' })
    prismaMock.priceAlert.findMany.mockResolvedValue([
      { id: 'alert-1', recipeId: 'recipe-1', targetPrice: 10.0, triggered: false },
      { id: 'alert-2', recipeId: 'recipe-2', targetPrice: 8.0, triggered: false },
    ])

    const res = await app.inject({
      method: 'GET',
      url: '/prices/alerts',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body.alerts).toHaveLength(2)
  })

  it('returns 403 for a Free user', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', tier: 'FREE' })

    const res = await app.inject({
      method: 'GET',
      url: '/prices/alerts',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(403)
  })

  it('returns 401 without auth', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/prices/alerts',
    })

    expect(res.statusCode).toBe(401)
  })
})

// ─── DELETE /prices/alerts/:id ────────────────────────────────────────────────

describe('DELETE /prices/alerts/:id', () => {
  it('deletes an alert owned by the user', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', tier: 'PLUS' })
    prismaMock.priceAlert.findFirst.mockResolvedValue({
      id: 'alert-1',
      userId: 'user-1',
    })
    prismaMock.priceAlert.delete.mockResolvedValue({ id: 'alert-1' })

    const res = await app.inject({
      method: 'DELETE',
      url: '/prices/alerts/alert-1',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(200)
  })

  it('returns 404 when alert does not belong to the user', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', tier: 'PLUS' })
    prismaMock.priceAlert.findFirst.mockResolvedValue(null)

    const res = await app.inject({
      method: 'DELETE',
      url: '/prices/alerts/alert-other',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(404)
  })

  it('returns 401 without auth', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/prices/alerts/alert-1',
    })

    expect(res.statusCode).toBe(401)
  })
})
