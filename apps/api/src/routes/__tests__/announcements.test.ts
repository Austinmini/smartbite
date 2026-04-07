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

describe('GET /announcements', () => {
  it('returns active announcements filtered by user tier', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', tier: 'FREE' })
    prismaMock.announcement.findMany.mockResolvedValue([
      {
        id: 'ann-1',
        title: 'Welcome!',
        body: 'Scan your first item to earn Bites.',
        type: 'BANNER',
        style: 'INFO',
        targetTiers: ['FREE', 'PLUS', 'PRO'],
        ctaText: null,
        ctaDeepLink: null,
        startsAt: new Date(),
        endsAt: null,
      },
    ])

    const res = await app.inject({
      method: 'GET',
      url: '/announcements',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body.announcements).toHaveLength(1)
    expect(body.announcements[0].type).toBe('BANNER')
  })

  it('returns empty array when no active announcements exist for user tier', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', tier: 'FREE' })
    prismaMock.announcement.findMany.mockResolvedValue([])

    const res = await app.inject({
      method: 'GET',
      url: '/announcements',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body.announcements).toEqual([])
  })

  it('returns 401 without auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/announcements' })
    expect(res.statusCode).toBe(401)
  })

  it('includes announcement fields needed by mobile', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', tier: 'PLUS' })
    prismaMock.announcement.findMany.mockResolvedValue([
      {
        id: 'ann-2',
        title: 'New Feature',
        body: 'Price trends are here!',
        type: 'MODAL',
        style: 'SUCCESS',
        targetTiers: ['PRO', 'PLUS'],
        ctaText: 'Try it now',
        ctaDeepLink: '/prices/trends',
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 7 * 86400000),
      },
    ])

    const res = await app.inject({
      method: 'GET',
      url: '/announcements',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body.announcements[0]).toHaveProperty('ctaText')
    expect(body.announcements[0]).toHaveProperty('ctaDeepLink')
    expect(body.announcements[0]).toHaveProperty('style')
  })
})
