import '../../test/mocks/prisma'
import '../../test/mocks/supabase'

jest.mock('../../lib/openFoodFacts', () => ({
  lookupByUpc: jest.fn(),
}))

jest.mock('../../services/rewardsService', () => ({
  processScanReward: jest.fn(),
}))

import { buildApp } from '../../app'
import { prisma } from '../../lib/prisma'
import { createAuthToken } from '../../test/factories'
import * as openFoodFacts from '../../lib/openFoodFacts'
import * as rewardsService from '../../services/rewardsService'

const prismaMock = prisma as any
const offMock = openFoodFacts as jest.Mocked<typeof openFoodFacts>
const rewardsMock = rewardsService as jest.Mocked<typeof rewardsService>

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

// ── GET /products/lookup/:upc ────────────────────────────────────────────────

describe('GET /products/lookup/:upc', () => {
  it('returns cached product from DB without calling Open Food Facts', async () => {
    prismaMock.product.findUnique.mockResolvedValue({
      upc: '012345678901',
      name: 'Organic Whole Milk',
      brand: 'HEB',
      imageUrl: 'https://example.com/milk.jpg',
      unitSize: '1 gallon',
      source: 'open_food_facts',
    })

    const res = await app.inject({
      method: 'GET',
      url: '/products/lookup/012345678901',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().name).toBe('Organic Whole Milk')
    expect(res.json().upc).toBe('012345678901')
    expect(offMock.lookupByUpc).not.toHaveBeenCalled()
  })

  it('calls Open Food Facts on cache miss and caches the result', async () => {
    prismaMock.product.findUnique.mockResolvedValue(null)
    offMock.lookupByUpc.mockResolvedValue({
      name: 'Organic Whole Milk',
      brand: 'HEB',
      imageUrl: 'https://example.com/milk.jpg',
      unitSize: '1 gallon',
    })
    prismaMock.product.upsert.mockResolvedValue({
      upc: '012345678901',
      name: 'Organic Whole Milk',
      brand: 'HEB',
      imageUrl: 'https://example.com/milk.jpg',
      unitSize: '1 gallon',
      source: 'open_food_facts',
    })

    const res = await app.inject({
      method: 'GET',
      url: '/products/lookup/012345678901',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(200)
    expect(offMock.lookupByUpc).toHaveBeenCalledWith('012345678901')
    expect(prismaMock.product.upsert).toHaveBeenCalled()
    expect(res.json().name).toBe('Organic Whole Milk')
  })

  it('returns 404 when product is not found in DB or Open Food Facts', async () => {
    prismaMock.product.findUnique.mockResolvedValue(null)
    offMock.lookupByUpc.mockResolvedValue(null)

    const res = await app.inject({
      method: 'GET',
      url: '/products/lookup/000000000000',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(404)
    expect(res.json().error).toMatch(/not found/i)
  })

  it('returns 401 without auth', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/products/lookup/012345678901',
    })

    expect(res.statusCode).toBe(401)
  })
})

// ── POST /prices/observation ─────────────────────────────────────────────────

describe('POST /prices/observation', () => {
  const validObservation = {
    upc: '012345678901',
    storeId: 'heb-austin-1',
    storeName: 'HEB',
    storeLocation: { lat: 30.27, lng: -97.74, address: '123 Main St', city: 'Austin', state: 'TX' },
    price: 3.99,
    unitSize: '1 gallon',
  }

  it('writes observation to DB and returns awarded bites', async () => {
    prismaMock.priceObservation.create.mockResolvedValue({
      id: 'obs-1',
      upc: '012345678901',
      storeId: 'heb-austin-1',
      storeName: 'HEB',
      price: 3.99,
      userId: 'user-1',
      scannedAt: new Date(),
    })
    rewardsMock.processScanReward.mockResolvedValue({
      totalAwarded: 5,
      breakdown: [{ amount: 5, reason: 'PRICE_SCAN' }],
    })

    const res = await app.inject({
      method: 'POST',
      url: '/prices/observation',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(validObservation),
    })

    expect(res.statusCode).toBe(201)
    expect(prismaMock.priceObservation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          upc: '012345678901',
          storeId: 'heb-austin-1',
          price: 3.99,
          userId: 'user-1',
        }),
      })
    )
    expect(rewardsMock.processScanReward).toHaveBeenCalledWith('user-1', expect.objectContaining({ id: 'obs-1' }))
    expect(res.json().observationId).toBe('obs-1')
    expect(res.json().bites.totalAwarded).toBe(5)
  })

  it('returns 400 when upc is missing', async () => {
    const { upc: _upc, ...noUpc } = validObservation
    const res = await app.inject({
      method: 'POST',
      url: '/prices/observation',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(noUpc),
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBeDefined()
  })

  it('works when storeId is missing (uses storeName as identifier)', async () => {
    const { storeId: _sid, ...noStoreId } = validObservation
    prismaMock.priceObservation.create.mockResolvedValue({
      id: 'obs-1',
      upc: '012345678901',
      storeId: 'HEB', // API uses storeName as fallback
      storeName: 'HEB',
      price: 3.99,
      userId: 'user-1',
      scannedAt: new Date(),
    })
    rewardsMock.processScanReward.mockResolvedValue({
      totalAwarded: 5,
      breakdown: [{ amount: 5, reason: 'PRICE_SCAN' }],
    })

    const res = await app.inject({
      method: 'POST',
      url: '/prices/observation',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(noStoreId),
    })

    expect(res.statusCode).toBe(201)
    // Verify that storeId was set to storeName
    expect(prismaMock.priceObservation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          storeId: 'HEB', // Should use storeName as fallback
        }),
      })
    )
  })

  it('returns 400 when price is negative', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/prices/observation',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validObservation, price: -1 }),
    })

    expect(res.statusCode).toBe(400)
  })

  it('returns 401 without auth', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/prices/observation',
    })

    expect(res.statusCode).toBe(401)
  })
})
