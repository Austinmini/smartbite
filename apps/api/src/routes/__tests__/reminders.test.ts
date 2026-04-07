import '../../test/mocks/prisma'
import '../../test/mocks/supabase'

jest.mock('../../services/reminderService', () => ({
  getReminderSuggestions: jest.fn(),
}))

import { buildApp } from '../../app'
import { createAuthToken } from '../../test/factories'
import { prisma } from '../../lib/prisma'
import * as reminderService from '../../services/reminderService'

const prismaMock = prisma as any
const reminderMock = reminderService as jest.Mocked<typeof reminderService>

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

// ─── GET /reminders ───────────────────────────────────────────────────────────

describe('GET /reminders', () => {
  it('returns all reminders for a Pro user', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', tier: 'PRO' })
    prismaMock.purchaseReminder.findMany.mockResolvedValue([
      {
        id: 'rem-1',
        userId: 'user-1',
        itemName: 'eggs',
        quantity: 12,
        unit: 'each',
        frequencyDays: 7,
        nextRemindAt: new Date(),
        active: true,
      },
    ])

    const res = await app.inject({
      method: 'GET',
      url: '/reminders',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body.reminders).toHaveLength(1)
    expect(body.reminders[0].itemName).toBe('eggs')
  })

  it('returns 403 for a Free user (Pro gate)', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', tier: 'FREE' })

    const res = await app.inject({
      method: 'GET',
      url: '/reminders',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(403)
  })

  it('returns 403 for a Plus user (Pro gate)', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', tier: 'PLUS' })

    const res = await app.inject({
      method: 'GET',
      url: '/reminders',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(403)
  })

  it('returns 401 without auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/reminders' })
    expect(res.statusCode).toBe(401)
  })
})

// ─── POST /reminders ─────────────────────────────────────────────────────────

describe('POST /reminders', () => {
  it('creates a reminder for a Pro user', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', tier: 'PRO' })
    prismaMock.purchaseReminder.upsert.mockResolvedValue({
      id: 'rem-1',
      userId: 'user-1',
      itemName: 'milk',
      quantity: 1,
      unit: 'gallon',
      frequencyDays: 5,
      nextRemindAt: new Date(),
      active: true,
    })

    const res = await app.inject({
      method: 'POST',
      url: '/reminders',
      headers: authHeaders(),
      payload: { itemName: 'milk', quantity: 1, unit: 'gallon', frequencyDays: 5 },
    })

    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.payload)
    expect(body.itemName).toBe('milk')
  })

  it('returns 403 for a Free user (Pro gate)', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', tier: 'FREE' })

    const res = await app.inject({
      method: 'POST',
      url: '/reminders',
      headers: authHeaders(),
      payload: { itemName: 'milk', quantity: 1, unit: 'gallon', frequencyDays: 5 },
    })

    expect(res.statusCode).toBe(403)
  })

  it('returns 400 when itemName is missing', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', tier: 'PRO' })

    const res = await app.inject({
      method: 'POST',
      url: '/reminders',
      headers: authHeaders(),
      payload: { quantity: 1, unit: 'gallon', frequencyDays: 5 },
    })

    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when frequencyDays is zero or negative', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', tier: 'PRO' })

    const res = await app.inject({
      method: 'POST',
      url: '/reminders',
      headers: authHeaders(),
      payload: { itemName: 'eggs', quantity: 12, unit: 'each', frequencyDays: 0 },
    })

    expect(res.statusCode).toBe(400)
  })

  it('returns 401 without auth', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/reminders',
      payload: { itemName: 'eggs', quantity: 12, unit: 'each', frequencyDays: 7 },
    })
    expect(res.statusCode).toBe(401)
  })
})

// ─── PUT /reminders/:id ───────────────────────────────────────────────────────

describe('PUT /reminders/:id', () => {
  it('updates frequency and quantity for a Pro user', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', tier: 'PRO' })
    prismaMock.purchaseReminder.findFirst.mockResolvedValue({
      id: 'rem-1',
      userId: 'user-1',
    })
    prismaMock.purchaseReminder.update.mockResolvedValue({
      id: 'rem-1',
      userId: 'user-1',
      itemName: 'eggs',
      quantity: 24,
      unit: 'each',
      frequencyDays: 14,
      nextRemindAt: new Date(),
    })

    const res = await app.inject({
      method: 'PUT',
      url: '/reminders/rem-1',
      headers: authHeaders(),
      payload: { quantity: 24, frequencyDays: 14 },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body.frequencyDays).toBe(14)
  })

  it('returns 404 when reminder does not belong to user', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', tier: 'PRO' })
    prismaMock.purchaseReminder.findFirst.mockResolvedValue(null)

    const res = await app.inject({
      method: 'PUT',
      url: '/reminders/rem-other',
      headers: authHeaders(),
      payload: { frequencyDays: 7 },
    })

    expect(res.statusCode).toBe(404)
  })

  it('returns 403 for a Free user', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', tier: 'FREE' })

    const res = await app.inject({
      method: 'PUT',
      url: '/reminders/rem-1',
      headers: authHeaders(),
      payload: { frequencyDays: 7 },
    })

    expect(res.statusCode).toBe(403)
  })
})

// ─── DELETE /reminders/:id ────────────────────────────────────────────────────

describe('DELETE /reminders/:id', () => {
  it('deletes a reminder for a Pro user', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', tier: 'PRO' })
    prismaMock.purchaseReminder.findFirst.mockResolvedValue({
      id: 'rem-1',
      userId: 'user-1',
    })
    prismaMock.purchaseReminder.delete.mockResolvedValue({ id: 'rem-1' })

    const res = await app.inject({
      method: 'DELETE',
      url: '/reminders/rem-1',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(200)
  })

  it('returns 404 when reminder does not belong to user', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', tier: 'PRO' })
    prismaMock.purchaseReminder.findFirst.mockResolvedValue(null)

    const res = await app.inject({
      method: 'DELETE',
      url: '/reminders/rem-other',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(404)
  })

  it('returns 401 without auth', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/reminders/rem-1' })
    expect(res.statusCode).toBe(401)
  })
})

// ─── GET /reminders/suggestions ──────────────────────────────────────────────

describe('GET /reminders/suggestions', () => {
  it('returns AI-generated suggestions for a Pro user with purchase history', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', tier: 'PRO' })
    reminderMock.getReminderSuggestions.mockResolvedValue([
      {
        itemName: 'eggs',
        suggestedQuantity: 12,
        suggestedUnit: 'each',
        suggestedFrequencyDays: 7,
        confidence: 'high',
        reasoning: 'You buy eggs every 6-7 days, usually 1 dozen.',
      },
    ])

    const res = await app.inject({
      method: 'GET',
      url: '/reminders/suggestions',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body.suggestions).toHaveLength(1)
    expect(body.suggestions[0]).toHaveProperty('reasoning')
    expect(body.suggestions[0]).toHaveProperty('confidence')
  })

  it('returns 403 for a Free user (Pro gate)', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', tier: 'FREE' })

    const res = await app.inject({
      method: 'GET',
      url: '/reminders/suggestions',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(403)
  })

  it('returns 401 without auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/reminders/suggestions' })
    expect(res.statusCode).toBe(401)
  })
})
