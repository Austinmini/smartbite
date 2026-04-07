import '../../test/mocks/prisma'

import { prisma } from '../../lib/prisma'
import {
  getPriceTrend,
  getTrendDirection,
  enrichShoppingListWithTrends,
} from '../priceTrendService'

const prismaMock = prisma as any

beforeEach(() => {
  jest.clearAllMocks()
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeObs(price: number, daysAgo: number, storeName = 'heb') {
  const scannedAt = new Date()
  scannedAt.setDate(scannedAt.getDate() - daysAgo)
  return { price, scannedAt, storeName, storeId: storeName }
}

// ─── getPriceTrend ────────────────────────────────────────────────────────────

describe('getPriceTrend', () => {
  it('returns bucketed weekly averages from observations', async () => {
    const obs = [
      makeObs(3.0, 2),
      makeObs(3.5, 9),
      makeObs(4.0, 16),
    ]
    prismaMock.priceObservation.findMany.mockResolvedValue(obs)

    const result = await getPriceTrend({ ingredient: 'chicken breast', storeId: 'heb', days: 30 })

    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toHaveProperty('week')
    expect(result[0]).toHaveProperty('avgPrice')
    expect(result[0]).toHaveProperty('observationCount')
  })

  it('returns empty array when no observations exist', async () => {
    prismaMock.priceObservation.findMany.mockResolvedValue([])

    const result = await getPriceTrend({ ingredient: 'truffle oil', storeId: 'whole-foods', days: 30 })

    expect(result).toEqual([])
  })

  it('respects the days parameter when querying', async () => {
    prismaMock.priceObservation.findMany.mockResolvedValue([])

    await getPriceTrend({ ingredient: 'milk', storeId: 'heb', days: 7 })

    const callArgs = prismaMock.priceObservation.findMany.mock.calls[0][0]
    const cutoff: Date = callArgs.where.scannedAt.gte
    const diffDays = Math.round((Date.now() - cutoff.getTime()) / 86_400_000)
    expect(diffDays).toBeLessThanOrEqual(8) // 7 days ± 1 for test timing
  })

  it('groups observations into distinct weekly buckets', async () => {
    const obs = [
      makeObs(2.0, 1),
      makeObs(2.5, 2),
      makeObs(3.0, 8),
      makeObs(3.5, 9),
      makeObs(4.0, 15),
    ]
    prismaMock.priceObservation.findMany.mockResolvedValue(obs)

    const result = await getPriceTrend({ ingredient: 'eggs', storeId: 'walmart', days: 30 })

    expect(result.length).toBeGreaterThanOrEqual(2)
    // Each bucket should have a valid avg
    result.forEach((bucket) => {
      expect(typeof bucket.avgPrice).toBe('number')
      expect(bucket.observationCount).toBeGreaterThan(0)
    })
  })
})

// ─── getTrendDirection ────────────────────────────────────────────────────────

describe('getTrendDirection', () => {
  it('returns "up" when price rose more than 5% vs prior week', () => {
    const buckets = [
      { week: 'w1', avgPrice: 3.0, observationCount: 3 },
      { week: 'w2', avgPrice: 3.2, observationCount: 3 }, // +6.7%
    ]
    expect(getTrendDirection(buckets)).toBe('up')
  })

  it('returns "down" when price fell more than 5% vs prior week', () => {
    const buckets = [
      { week: 'w1', avgPrice: 3.0, observationCount: 3 },
      { week: 'w2', avgPrice: 2.8, observationCount: 3 }, // -6.7%
    ]
    expect(getTrendDirection(buckets)).toBe('down')
  })

  it('returns "stable" when change is within 5%', () => {
    const buckets = [
      { week: 'w1', avgPrice: 3.0, observationCount: 3 },
      { week: 'w2', avgPrice: 3.1, observationCount: 3 }, // +3.3%
    ]
    expect(getTrendDirection(buckets)).toBe('stable')
  })

  it('returns null when fewer than 2 weekly buckets exist', () => {
    const buckets = [{ week: 'w1', avgPrice: 3.0, observationCount: 3 }]
    expect(getTrendDirection(buckets)).toBeNull()
  })

  it('returns null when buckets array is empty', () => {
    expect(getTrendDirection([])).toBeNull()
  })
})

// ─── enrichShoppingListWithTrends ─────────────────────────────────────────────

describe('enrichShoppingListWithTrends', () => {
  it('adds trendDirection to each shopping list item', async () => {
    const obs = [makeObs(2.0, 1), makeObs(2.5, 2), makeObs(3.2, 8), makeObs(3.0, 9)]
    prismaMock.priceObservation.findMany.mockResolvedValue(obs)

    const items = [{ name: 'chicken breast', amount: 1, unit: 'lb', storeId: 'heb' }]
    const result = await enrichShoppingListWithTrends(items)

    expect(result[0]).toHaveProperty('trendDirection')
    expect(['up', 'down', 'stable', null]).toContain(result[0].trendDirection)
  })

  it('returns null trendDirection for items with no observations', async () => {
    prismaMock.priceObservation.findMany.mockResolvedValue([])

    const items = [{ name: 'dragon fruit', amount: 1, unit: 'each', storeId: 'heb' }]
    const result = await enrichShoppingListWithTrends(items)

    expect(result[0].trendDirection).toBeNull()
  })

  it('handles multiple items independently', async () => {
    prismaMock.priceObservation.findMany
      .mockResolvedValueOnce([makeObs(2.0, 1), makeObs(3.0, 8)]) // chicken — up
      .mockResolvedValueOnce([]) // rare item — no data

    const items = [
      { name: 'chicken breast', amount: 1, unit: 'lb', storeId: 'heb' },
      { name: 'rare herb', amount: 1, unit: 'bunch', storeId: 'heb' },
    ]
    const result = await enrichShoppingListWithTrends(items)

    expect(result).toHaveLength(2)
    expect(result[1].trendDirection).toBeNull()
  })
})
