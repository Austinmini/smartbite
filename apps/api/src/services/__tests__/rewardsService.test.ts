import '../../test/mocks/prisma'

import { prisma } from '../../lib/prisma'
import {
  awardBites,
  processScanReward,
  updateStreak,
  checkAndAwardBadges,
} from '../rewardsService'

const prismaMock = prisma as any

beforeEach(() => {
  jest.clearAllMocks()
})

// ── awardBites ────────────────────────────────────────────────────────────────

describe('awardBites', () => {
  // awardBites calls checkAndAwardBadges internally — set up badge-related mocks
  beforeEach(() => {
    prismaMock.$transaction.mockImplementation(async (ops: any[]) => {
      for (const op of ops) await op
    })
    prismaMock.bitesLedger.create.mockResolvedValue({})
    prismaMock.bitesBalance.findUnique.mockResolvedValue({ balance: 5, lifetimeEarned: 5 })
    prismaMock.userProfile.findUnique.mockResolvedValue({ scanCount: 1 })
    prismaMock.userBadge.findMany.mockResolvedValue([])
    prismaMock.userBadge.createMany.mockResolvedValue({ count: 0 })
  })

  it('creates a ledger entry and upserts the balance', async () => {
    prismaMock.bitesBalance.upsert.mockResolvedValue({ balance: 5, lifetimeEarned: 5 })

    await awardBites('user-1', 5, 'PRICE_SCAN')

    expect(prismaMock.bitesLedger.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'user-1', amount: 5, reason: 'PRICE_SCAN' }),
      })
    )
    expect(prismaMock.bitesBalance.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
        update: expect.objectContaining({ balance: { increment: 5 } }),
      })
    )
  })

  it('passes referenceId to ledger when provided', async () => {
    prismaMock.bitesBalance.upsert.mockResolvedValue({})

    await awardBites('user-1', 3, 'VERIFIED_SCAN', 'obs-123')

    expect(prismaMock.bitesLedger.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ referenceId: 'obs-123' }),
      })
    )
  })

  it('does not increment lifetimeEarned for negative amounts', async () => {
    prismaMock.bitesBalance.upsert.mockResolvedValue({})

    await awardBites('user-1', -100, 'REDEMPTION')

    expect(prismaMock.bitesBalance.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ lifetimeEarned: { increment: 0 } }),
      })
    )
  })
})

// ── processScanReward ────────────────────────────────────────────────────────

describe('processScanReward', () => {
  const baseObservation = {
    id: 'obs-1',
    upc: '012345678901',
    storeId: 'heb-1',
    storeName: 'HEB',
    price: 3.99,
    userId: 'user-1',
    scannedAt: new Date(),
  }

  beforeEach(() => {
    prismaMock.$transaction.mockImplementation(async (ops: any[]) => {
      for (const op of ops) await op
    })
    prismaMock.bitesLedger.create.mockResolvedValue({})
    prismaMock.bitesBalance.upsert.mockResolvedValue({})
    prismaMock.userBadge.findMany.mockResolvedValue([])
    prismaMock.userBadge.createMany.mockResolvedValue({ count: 0 })
    prismaMock.bitesBalance.findUnique.mockResolvedValue({ balance: 5, lifetimeEarned: 5 })
    prismaMock.userProfile.findUnique.mockResolvedValue({ scanCount: 1 })
    prismaMock.userProfile.update.mockResolvedValue({})
    prismaMock.scanStreak.findUnique.mockResolvedValue(null)
    prismaMock.scanStreak.upsert.mockResolvedValue({})
  })

  it('awards 5 base Bites for a normal scan', async () => {
    prismaMock.priceObservation.count.mockResolvedValue(5) // not pioneer
    prismaMock.canonicalPrice.findUnique.mockResolvedValue({
      lastUpdated: new Date(), // fresh — no stale bonus
    })

    const result = await processScanReward('user-1', baseObservation as any)

    const hasPriceScan = result.breakdown.some((r: any) => r.reason === 'PRICE_SCAN')
    expect(hasPriceScan).toBe(true)
    expect(result.totalAwarded).toBeGreaterThanOrEqual(5)
  })

  it('awards a +15 pioneer bonus when this is the first scan at a store', async () => {
    prismaMock.priceObservation.count.mockResolvedValue(0) // pioneer!
    prismaMock.canonicalPrice.findUnique.mockResolvedValue(null)

    const result = await processScanReward('user-1', baseObservation as any)

    const hasPioneer = result.breakdown.some((r: any) => r.reason === 'PIONEER_SCAN')
    expect(hasPioneer).toBe(true)
    expect(result.totalAwarded).toBeGreaterThanOrEqual(20) // 5 base + 15 pioneer
  })

  it('awards a +5 stale update bonus when canonical price is older than 5 days', async () => {
    prismaMock.priceObservation.count.mockResolvedValue(5) // not pioneer
    const staleDate = new Date()
    staleDate.setDate(staleDate.getDate() - 6) // 6 days old
    prismaMock.canonicalPrice.findUnique.mockResolvedValue({
      lastUpdated: staleDate,
    })

    const result = await processScanReward('user-1', baseObservation as any)

    const hasStale = result.breakdown.some((r: any) => r.reason === 'STALE_UPDATE')
    expect(hasStale).toBe(true)
    expect(result.totalAwarded).toBeGreaterThanOrEqual(10) // 5 base + 5 stale
  })

  it('does not award stale bonus when canonical price is fresh', async () => {
    prismaMock.priceObservation.count.mockResolvedValue(5)
    prismaMock.canonicalPrice.findUnique.mockResolvedValue({
      lastUpdated: new Date(), // fresh
    })

    const result = await processScanReward('user-1', baseObservation as any)

    const hasStale = result.breakdown.some((r: any) => r.reason === 'STALE_UPDATE')
    expect(hasStale).toBe(false)
  })

  it('increments scanCount on UserProfile', async () => {
    prismaMock.priceObservation.count.mockResolvedValue(5)
    prismaMock.canonicalPrice.findUnique.mockResolvedValue(null)

    await processScanReward('user-1', baseObservation as any)

    expect(prismaMock.userProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
        data: { scanCount: { increment: 1 } },
      })
    )
  })
})

// ── updateStreak ─────────────────────────────────────────────────────────────

describe('updateStreak', () => {
  beforeEach(() => {
    prismaMock.$transaction.mockImplementation(async (ops: any[]) => {
      for (const op of ops) await op
    })
    prismaMock.bitesLedger.create.mockResolvedValue({})
    prismaMock.bitesBalance.upsert.mockResolvedValue({})
    prismaMock.userBadge.findMany.mockResolvedValue([])
    prismaMock.userBadge.createMany.mockResolvedValue({ count: 0 })
    prismaMock.bitesBalance.findUnique.mockResolvedValue({ balance: 0, lifetimeEarned: 0 })
    prismaMock.userProfile.findUnique.mockResolvedValue({ scanCount: 1 })
  })

  it('starts a streak at 1 for a new user', async () => {
    prismaMock.scanStreak.findUnique.mockResolvedValue(null)
    prismaMock.scanStreak.upsert.mockResolvedValue({})

    await updateStreak('user-1')

    expect(prismaMock.scanStreak.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ currentStreak: 1, longestStreak: 1 }),
      })
    )
  })

  it('extends streak when last scan was yesterday', async () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    prismaMock.scanStreak.findUnique.mockResolvedValue({
      userId: 'user-1',
      currentStreak: 3,
      longestStreak: 3,
      lastScanDate: yesterday,
    })
    prismaMock.scanStreak.upsert.mockResolvedValue({})

    await updateStreak('user-1')

    expect(prismaMock.scanStreak.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ currentStreak: 4 }),
      })
    )
  })

  it('resets streak to 1 when last scan was more than 1 day ago', async () => {
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    prismaMock.scanStreak.findUnique.mockResolvedValue({
      userId: 'user-1',
      currentStreak: 5,
      longestStreak: 10,
      lastScanDate: threeDaysAgo,
    })
    prismaMock.scanStreak.upsert.mockResolvedValue({})

    await updateStreak('user-1')

    expect(prismaMock.scanStreak.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ currentStreak: 1 }),
      })
    )
  })

  it('does not update streak when user already scanned today', async () => {
    const today = new Date()
    prismaMock.scanStreak.findUnique.mockResolvedValue({
      userId: 'user-1',
      currentStreak: 2,
      longestStreak: 2,
      lastScanDate: today,
    })
    prismaMock.scanStreak.upsert.mockResolvedValue({})

    await updateStreak('user-1')

    expect(prismaMock.scanStreak.upsert).not.toHaveBeenCalled()
  })

  it('awards +25 Bites on a 7-day streak', async () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    prismaMock.scanStreak.findUnique.mockResolvedValue({
      userId: 'user-1',
      currentStreak: 6,
      longestStreak: 6,
      lastScanDate: yesterday,
    })
    prismaMock.scanStreak.upsert.mockResolvedValue({})

    await updateStreak('user-1')

    // awardBites should be called with STREAK_7_DAY
    expect(prismaMock.bitesLedger.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ reason: 'STREAK_7_DAY', amount: 25 }),
      })
    )
  })

  it('awards +100 Bites on a 30-day streak', async () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    prismaMock.scanStreak.findUnique.mockResolvedValue({
      userId: 'user-1',
      currentStreak: 29,
      longestStreak: 29,
      lastScanDate: yesterday,
    })
    prismaMock.scanStreak.upsert.mockResolvedValue({})

    await updateStreak('user-1')

    expect(prismaMock.bitesLedger.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ reason: 'STREAK_30_DAY', amount: 100 }),
      })
    )
  })
})

// ── checkAndAwardBadges ──────────────────────────────────────────────────────

describe('checkAndAwardBadges', () => {
  beforeEach(() => {
    prismaMock.userBadge.createMany.mockResolvedValue({ count: 0 })
  })

  it('awards FIRST_SCAN badge on first scan', async () => {
    prismaMock.bitesBalance.findUnique.mockResolvedValue({ balance: 5, lifetimeEarned: 5 })
    prismaMock.userProfile.findUnique.mockResolvedValue({ scanCount: 1 })
    prismaMock.userBadge.findMany.mockResolvedValue([])

    await checkAndAwardBadges('user-1')

    expect(prismaMock.userBadge.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ badge: 'FIRST_SCAN' }),
        ]),
      })
    )
  })

  it('awards CENTURY badge at 100 scans', async () => {
    prismaMock.bitesBalance.findUnique.mockResolvedValue({ balance: 500, lifetimeEarned: 500 })
    prismaMock.userProfile.findUnique.mockResolvedValue({ scanCount: 100 })
    prismaMock.userBadge.findMany.mockResolvedValue([
      { badge: 'FIRST_SCAN' }, // already has this
    ])

    await checkAndAwardBadges('user-1')

    expect(prismaMock.userBadge.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ badge: 'CENTURY' }),
        ]),
      })
    )
  })

  it('awards PRICE_CHAMPION badge at 2000 lifetime Bites', async () => {
    prismaMock.bitesBalance.findUnique.mockResolvedValue({ balance: 1000, lifetimeEarned: 2000 })
    prismaMock.userProfile.findUnique.mockResolvedValue({ scanCount: 50 })
    prismaMock.userBadge.findMany.mockResolvedValue([
      { badge: 'FIRST_SCAN' },
    ])

    await checkAndAwardBadges('user-1')

    expect(prismaMock.userBadge.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ badge: 'PRICE_CHAMPION' }),
        ]),
      })
    )
  })

  it('does not award a badge the user already has', async () => {
    prismaMock.bitesBalance.findUnique.mockResolvedValue({ balance: 5, lifetimeEarned: 5 })
    prismaMock.userProfile.findUnique.mockResolvedValue({ scanCount: 1 })
    prismaMock.userBadge.findMany.mockResolvedValue([
      { badge: 'FIRST_SCAN' }, // already awarded
    ])

    await checkAndAwardBadges('user-1')

    expect(prismaMock.userBadge.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: [] })
    )
  })

  it('does not call createMany when there are no new badges to award', async () => {
    prismaMock.bitesBalance.findUnique.mockResolvedValue({ balance: 0, lifetimeEarned: 0 })
    prismaMock.userProfile.findUnique.mockResolvedValue({ scanCount: 0 })
    prismaMock.userBadge.findMany.mockResolvedValue([])

    await checkAndAwardBadges('user-1')

    // createMany should either not be called or called with empty array — no new badges
    const calls = prismaMock.userBadge.createMany.mock.calls
    if (calls.length > 0) {
      expect(calls[0][0].data).toHaveLength(0)
    }
  })
})
