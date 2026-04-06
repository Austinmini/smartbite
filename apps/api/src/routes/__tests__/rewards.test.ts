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
})

const authHeaders = () => ({ Authorization: `Bearer ${createAuthToken('user-1')}` })

// ── GET /rewards/balance ──────────────────────────────────────────────────────

describe('GET /rewards/balance', () => {
  it('returns balance and lifetimeEarned for the current user', async () => {
    prismaMock.bitesBalance.findUnique.mockResolvedValue({
      userId: 'user-1',
      balance: 250,
      lifetimeEarned: 400,
      updatedAt: new Date(),
    })

    const res = await app.inject({
      method: 'GET',
      url: '/rewards/balance',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.balance).toBe(250)
    expect(body.lifetimeEarned).toBe(400)
    expect(prismaMock.bitesBalance.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1' } })
    )
  })

  it('returns zero balance when user has no record yet', async () => {
    prismaMock.bitesBalance.findUnique.mockResolvedValue(null)

    const res = await app.inject({
      method: 'GET',
      url: '/rewards/balance',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ balance: 0, lifetimeEarned: 0 })
  })

  it('returns 401 without auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/rewards/balance' })
    expect(res.statusCode).toBe(401)
  })
})

// ── GET /rewards/ledger ───────────────────────────────────────────────────────

describe('GET /rewards/ledger', () => {
  const mockLedger = [
    { id: 'l2', userId: 'user-1', amount: 5,  reason: 'PRICE_SCAN',   referenceId: 'obs-2', createdAt: new Date('2026-04-05') },
    { id: 'l1', userId: 'user-1', amount: 15, reason: 'PIONEER_SCAN', referenceId: 'obs-1', createdAt: new Date('2026-04-01') },
  ]

  it('returns ledger entries sorted by createdAt desc', async () => {
    prismaMock.bitesLedger.findMany.mockResolvedValue(mockLedger)
    prismaMock.bitesLedger.count.mockResolvedValue(2)

    const res = await app.inject({
      method: 'GET',
      url: '/rewards/ledger',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.entries).toHaveLength(2)
    expect(body.entries[0].reason).toBe('PRICE_SCAN')
    expect(body.total).toBe(2)
    expect(prismaMock.bitesLedger.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
      })
    )
  })

  it('supports limit and offset pagination', async () => {
    prismaMock.bitesLedger.findMany.mockResolvedValue([mockLedger[0]])
    prismaMock.bitesLedger.count.mockResolvedValue(2)

    const res = await app.inject({
      method: 'GET',
      url: '/rewards/ledger?limit=1&offset=0',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(200)
    expect(prismaMock.bitesLedger.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 1, skip: 0 })
    )
  })

  it('returns empty entries when no transactions exist', async () => {
    prismaMock.bitesLedger.findMany.mockResolvedValue([])
    prismaMock.bitesLedger.count.mockResolvedValue(0)

    const res = await app.inject({
      method: 'GET',
      url: '/rewards/ledger',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ entries: [], total: 0 })
  })

  it('returns 401 without auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/rewards/ledger' })
    expect(res.statusCode).toBe(401)
  })
})

// ── GET /rewards/badges ───────────────────────────────────────────────────────

describe('GET /rewards/badges', () => {
  it('returns earned badges and marks unearned badges as locked', async () => {
    prismaMock.userBadge.findMany.mockResolvedValue([
      { badge: 'FIRST_SCAN', earnedAt: new Date('2026-04-01') },
      { badge: 'PIONEER',    earnedAt: new Date('2026-04-02') },
    ])

    const res = await app.inject({
      method: 'GET',
      url: '/rewards/badges',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()

    const firstScan = body.badges.find((b: any) => b.badge === 'FIRST_SCAN')
    expect(firstScan.earned).toBe(true)
    expect(firstScan.earnedAt).toBeTruthy()

    const century = body.badges.find((b: any) => b.badge === 'CENTURY')
    expect(century.earned).toBe(false)
    expect(century.earnedAt).toBeNull()

    // All defined badge types are present
    expect(body.badges.length).toBeGreaterThanOrEqual(8)
  })

  it('returns all badges locked when user has earned none', async () => {
    prismaMock.userBadge.findMany.mockResolvedValue([])

    const res = await app.inject({
      method: 'GET',
      url: '/rewards/badges',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.badges.every((b: any) => b.earned === false)).toBe(true)
  })

  it('returns 401 without auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/rewards/badges' })
    expect(res.statusCode).toBe(401)
  })
})

// ── GET /rewards/leaderboard ──────────────────────────────────────────────────

describe('GET /rewards/leaderboard', () => {
  it('returns top contributors ranked by balance descending', async () => {
    prismaMock.bitesBalance.findMany.mockResolvedValue([
      { userId: 'user-2', balance: 800, lifetimeEarned: 1200, user: { email: 'alice@example.com' } },
      { userId: 'user-3', balance: 500, lifetimeEarned: 600,  user: { email: 'bob@example.com' } },
      { userId: 'user-1', balance: 250, lifetimeEarned: 400,  user: { email: 'me@example.com' } },
    ])

    const res = await app.inject({
      method: 'GET',
      url: '/rewards/leaderboard',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.leaderboard).toHaveLength(3)
    expect(body.leaderboard[0].rank).toBe(1)
    expect(body.leaderboard[0].balance).toBe(800)
    expect(body.leaderboard[1].rank).toBe(2)
    expect(prismaMock.bitesBalance.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { balance: 'desc' } })
    )
  })

  it('marks the current user\'s own entry with isCurrentUser: true', async () => {
    prismaMock.bitesBalance.findMany.mockResolvedValue([
      { userId: 'user-2', balance: 800, lifetimeEarned: 1200, user: { email: 'alice@example.com' } },
      { userId: 'user-1', balance: 250, lifetimeEarned: 400,  user: { email: 'me@example.com' } },
    ])

    const res = await app.inject({
      method: 'GET',
      url: '/rewards/leaderboard',
      headers: authHeaders(),
    })

    const body = res.json()
    const mine = body.leaderboard.find((e: any) => e.isCurrentUser)
    expect(mine).toBeDefined()
    expect(mine.balance).toBe(250)
  })

  it('returns empty leaderboard when no balances exist', async () => {
    prismaMock.bitesBalance.findMany.mockResolvedValue([])

    const res = await app.inject({
      method: 'GET',
      url: '/rewards/leaderboard',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().leaderboard).toEqual([])
  })

  it('returns 401 without auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/rewards/leaderboard' })
    expect(res.statusCode).toBe(401)
  })
})
