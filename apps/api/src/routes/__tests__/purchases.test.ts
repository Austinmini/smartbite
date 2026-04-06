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

const validPurchase = {
  itemName: 'chicken breast',
  quantity: 1.5,
  unit: 'lb',
  pricePerUnit: 4.99,
  totalPrice: 7.49,
  storeName: 'HEB',
}

// ── POST /purchases ───────────────────────────────────────────────────────────

describe('POST /purchases', () => {
  it('writes purchase to PurchaseHistory and returns 201', async () => {
    const created = {
      id: 'purchase-1',
      userId: 'user-1',
      itemName: 'chicken breast',
      itemCategory: 'GROCERY',
      upc: null,
      quantity: 1.5,
      unit: 'lb',
      pricePerUnit: 4.99,
      totalPrice: 7.49,
      storeName: 'HEB',
      storeId: null,
      planId: null,
      purchasedAt: new Date().toISOString(),
    }
    prismaMock.purchaseHistory.create.mockResolvedValue(created)

    const res = await app.inject({
      method: 'POST',
      url: '/purchases',
      headers: authHeaders(),
      payload: validPurchase,
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.purchase.itemName).toBe('chicken breast')
    expect(body.purchase.quantity).toBe(1.5)
    expect(prismaMock.purchaseHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          itemName: 'chicken breast',
          quantity: 1.5,
          unit: 'lb',
          pricePerUnit: 4.99,
          totalPrice: 7.49,
          storeName: 'HEB',
        }),
      })
    )
  })

  it('links purchase to planId when provided', async () => {
    const created = {
      id: 'purchase-2',
      userId: 'user-1',
      itemName: 'eggs',
      itemCategory: 'GROCERY',
      upc: null,
      quantity: 12,
      unit: 'each',
      pricePerUnit: 0.25,
      totalPrice: 2.99,
      storeName: 'Walmart',
      storeId: null,
      planId: 'plan-abc',
      purchasedAt: new Date().toISOString(),
    }
    prismaMock.purchaseHistory.create.mockResolvedValue(created)

    const res = await app.inject({
      method: 'POST',
      url: '/purchases',
      headers: authHeaders(),
      payload: { ...validPurchase, itemName: 'eggs', quantity: 12, unit: 'each', pricePerUnit: 0.25, totalPrice: 2.99, storeName: 'Walmart', planId: 'plan-abc' },
    })

    expect(res.statusCode).toBe(201)
    expect(prismaMock.purchaseHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ planId: 'plan-abc' }),
      })
    )
  })

  it('returns 400 when itemName is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/purchases',
      headers: authHeaders(),
      payload: { quantity: 1, unit: 'lb', pricePerUnit: 4.99, totalPrice: 4.99, storeName: 'HEB' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when quantity is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/purchases',
      headers: authHeaders(),
      payload: { itemName: 'eggs', unit: 'each', pricePerUnit: 0.25, totalPrice: 2.99, storeName: 'HEB' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when storeName is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/purchases',
      headers: authHeaders(),
      payload: { itemName: 'eggs', quantity: 12, unit: 'each', pricePerUnit: 0.25, totalPrice: 2.99 },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 401 without auth', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/purchases',
      payload: validPurchase,
    })
    expect(res.statusCode).toBe(401)
  })
})

// ── GET /purchases ────────────────────────────────────────────────────────────

describe('GET /purchases', () => {
  const mockPurchases = [
    { id: 'p2', userId: 'user-1', itemName: 'chicken breast', itemCategory: 'GROCERY', quantity: 2, unit: 'lb', pricePerUnit: 4.99, totalPrice: 9.98, storeName: 'HEB', purchasedAt: new Date('2026-04-05') },
    { id: 'p1', userId: 'user-1', itemName: 'chicken breast', itemCategory: 'GROCERY', quantity: 1.5, unit: 'lb', pricePerUnit: 4.99, totalPrice: 7.49, storeName: 'Kroger', purchasedAt: new Date('2026-04-01') },
  ]

  it('returns purchase history sorted by purchasedAt desc', async () => {
    prismaMock.purchaseHistory.findMany.mockResolvedValue(mockPurchases)

    const res = await app.inject({
      method: 'GET',
      url: '/purchases?ingredientName=chicken+breast',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.purchases).toHaveLength(2)
    expect(body.purchases[0].id).toBe('p2')
    expect(prismaMock.purchaseHistory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user-1', itemName: 'chicken breast' }),
        orderBy: { purchasedAt: 'desc' },
      })
    )
  })

  it('returns empty array for ingredient with no purchase history', async () => {
    prismaMock.purchaseHistory.findMany.mockResolvedValue([])

    const res = await app.inject({
      method: 'GET',
      url: '/purchases?ingredientName=truffle',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().purchases).toEqual([])
  })

  it('returns all purchases when ingredientName is omitted', async () => {
    prismaMock.purchaseHistory.findMany.mockResolvedValue(mockPurchases)

    const res = await app.inject({
      method: 'GET',
      url: '/purchases',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().purchases).toHaveLength(2)
    expect(prismaMock.purchaseHistory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user-1' }),
      })
    )
  })

  it('returns 401 without auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/purchases' })
    expect(res.statusCode).toBe(401)
  })
})
