import '../../test/mocks/prisma'
import '../../test/mocks/supabase'

import { buildApp } from '../../app'
import { prisma } from '../../lib/prisma'
import { createAuthToken } from '../../test/factories'
import { resetFeedbackRateLimitState } from '../feedback'

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
  resetFeedbackRateLimitState()
  prismaMock.feedback = prismaMock.feedback ?? {}
  prismaMock.feedback.create = jest.fn()
})

const authHeaders = () => ({ Authorization: `Bearer ${createAuthToken('user-1')}` })

describe('POST /feedback', () => {
  it('stores feedback for an authenticated user', async () => {
    prismaMock.feedback.create.mockResolvedValue({
      id: 'fb-1',
      userId: 'user-1',
      type: 'BUG',
      subject: 'App freezes',
      body: 'The scanner freezes after I grant camera access.',
      appVersion: '1.2.3',
      platform: 'ios',
      createdAt: new Date('2026-04-06T12:00:00.000Z'),
    })

    const res = await app.inject({
      method: 'POST',
      url: '/feedback',
      headers: authHeaders(),
      payload: {
        type: 'BUG',
        subject: 'App freezes',
        body: 'The scanner freezes after I grant camera access.',
        appVersion: '1.2.3',
        platform: 'ios',
      },
    })

    expect(res.statusCode).toBe(201)
    expect(res.json().feedback.type).toBe('BUG')
  })

  it('returns 400 when body is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/feedback',
      headers: authHeaders(),
      payload: { type: 'GENERAL' },
    })

    expect(res.statusCode).toBe(400)
  })

  it('returns 401 without auth', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/feedback',
      payload: { type: 'GENERAL', body: 'Need dark mode.' },
    })

    expect(res.statusCode).toBe(401)
  })

  it('rate limits after five submissions in an hour', async () => {
    prismaMock.feedback.create.mockResolvedValue({
      id: 'fb-1',
      userId: 'user-1',
      type: 'GENERAL',
      subject: null,
      body: 'Feedback body',
      appVersion: null,
      platform: null,
      createdAt: new Date('2026-04-06T12:00:00.000Z'),
    })

    const results = []
    for (const index of Array.from({ length: 6 }, (_, value) => value)) {
      results.push(
        await app.inject({
          method: 'POST',
          url: '/feedback',
          headers: authHeaders(),
          payload: { type: 'GENERAL', body: `Feedback body ${index}` },
        })
      )
    }

    expect(results.slice(0, 5).every((res) => res.statusCode === 201)).toBe(true)
    expect(results[5].statusCode).toBe(429)
  })
})
