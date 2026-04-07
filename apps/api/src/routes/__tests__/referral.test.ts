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

afterAll(async () => {
  await app.close()
})

beforeEach(() => {
  jest.clearAllMocks()
  prismaMock.referralEvent = prismaMock.referralEvent ?? {}
  prismaMock.referralReward = prismaMock.referralReward ?? {}
  prismaMock.referralCode.findUnique = jest.fn()
  prismaMock.referralEvent.count = jest.fn()
  prismaMock.referralReward.aggregate = jest.fn()
})

const authHeaders = () => ({ Authorization: `Bearer ${createAuthToken('user-1')}` })

describe('GET /referral/code', () => {
  it('returns the user referral code', async () => {
    prismaMock.referralCode.findUnique.mockResolvedValue({
      id: 'ref-code-1',
      userId: 'user-1',
      code: 'SMART6',
    })

    const res = await app.inject({
      method: 'GET',
      url: '/referral/code',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ code: 'SMART6' })
  })
})

describe('GET /referral/stats', () => {
  it('returns invited, converted, and total bites earned', async () => {
    prismaMock.referralEvent.count
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(2)
    prismaMock.referralReward.aggregate.mockResolvedValue({
      _sum: { bitesAwarded: 300 },
    })

    const res = await app.inject({
      method: 'GET',
      url: '/referral/stats',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({
      invited: 4,
      converted: 2,
      totalBitesEarned: 300,
    })
  })

  it('returns 401 without auth', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/referral/stats',
    })

    expect(res.statusCode).toBe(401)
  })
})
