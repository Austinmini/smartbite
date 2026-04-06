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

const mockPantryItem = {
  id: 'pantry-1',
  userId: 'user-1',
  itemName: 'chicken breast',
  itemCategory: 'GROCERY',
  quantity: 2.0,
  unit: 'lb',
  notes: null,
  lastRestockedAt: null,
  updatedAt: new Date().toISOString(),
}

// ── GET /pantry ───────────────────────────────────────────────────────────────

describe('GET /pantry', () => {
  it('returns all pantry items for the current user', async () => {
    prismaMock.pantryItem.findMany.mockResolvedValue([mockPantryItem])

    const res = await app.inject({
      method: 'GET',
      url: '/pantry',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.items).toHaveLength(1)
    expect(body.items[0].itemName).toBe('chicken breast')
    expect(prismaMock.pantryItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1' } })
    )
  })

  it('returns empty array when pantry is empty', async () => {
    prismaMock.pantryItem.findMany.mockResolvedValue([])

    const res = await app.inject({
      method: 'GET',
      url: '/pantry',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().items).toEqual([])
  })

  it('returns 401 without auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/pantry' })
    expect(res.statusCode).toBe(401)
  })
})

// ── POST /pantry ──────────────────────────────────────────────────────────────

describe('POST /pantry', () => {
  it('creates a new pantry item and writes a MANUAL_ADD ledger entry', async () => {
    prismaMock.pantryItem.upsert.mockResolvedValue(mockPantryItem)
    prismaMock.pantryLedger.create.mockResolvedValue({})

    const res = await app.inject({
      method: 'POST',
      url: '/pantry',
      headers: authHeaders(),
      payload: { itemName: 'chicken breast', quantity: 2.0, unit: 'lb' },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.item.itemName).toBe('chicken breast')
    expect(prismaMock.pantryItem.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_itemName: { userId: 'user-1', itemName: 'chicken breast' } },
        create: expect.objectContaining({ userId: 'user-1', itemName: 'chicken breast', quantity: 2.0, unit: 'lb' }),
      })
    )
    expect(prismaMock.pantryLedger.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          delta: 2.0,
          unit: 'lb',
          action: 'MANUAL_ADD',
        }),
      })
    )
  })

  it('returns 400 when itemName is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/pantry',
      headers: authHeaders(),
      payload: { quantity: 1, unit: 'lb' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when quantity is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/pantry',
      headers: authHeaders(),
      payload: { itemName: 'eggs', unit: 'each' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when unit is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/pantry',
      headers: authHeaders(),
      payload: { itemName: 'eggs', quantity: 12 },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 401 without auth', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/pantry',
      payload: { itemName: 'eggs', quantity: 12, unit: 'each' },
    })
    expect(res.statusCode).toBe(401)
  })
})

// ── PUT /pantry/:itemName ─────────────────────────────────────────────────────

describe('PUT /pantry/:itemName', () => {
  it('updates quantity and writes ADJUSTMENT ledger entry', async () => {
    const existing = { ...mockPantryItem, quantity: 2.0 }
    const updated = { ...mockPantryItem, quantity: 3.5 }
    prismaMock.pantryItem.findUnique.mockResolvedValue(existing)
    prismaMock.pantryItem.update.mockResolvedValue(updated)
    prismaMock.pantryLedger.create.mockResolvedValue({})

    const res = await app.inject({
      method: 'PUT',
      url: '/pantry/chicken%20breast',
      headers: authHeaders(),
      payload: { quantity: 3.5, unit: 'lb' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().item.quantity).toBe(3.5)
    expect(prismaMock.pantryLedger.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          delta: expect.closeTo(1.5, 5), // 3.5 - 2.0
          action: 'ADJUSTMENT',
        }),
      })
    )
  })

  it('returns 404 when item does not exist', async () => {
    prismaMock.pantryItem.findUnique.mockResolvedValue(null)

    const res = await app.inject({
      method: 'PUT',
      url: '/pantry/nonexistent',
      headers: authHeaders(),
      payload: { quantity: 1, unit: 'lb' },
    })

    expect(res.statusCode).toBe(404)
  })

  it('returns 401 without auth', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/pantry/chicken%20breast',
      payload: { quantity: 1, unit: 'lb' },
    })
    expect(res.statusCode).toBe(401)
  })
})

// ── DELETE /pantry/:itemName ──────────────────────────────────────────────────

describe('DELETE /pantry/:itemName', () => {
  it('deletes the pantry item and returns 204', async () => {
    prismaMock.pantryItem.findUnique.mockResolvedValue(mockPantryItem)
    prismaMock.pantryItem.delete.mockResolvedValue(mockPantryItem)

    const res = await app.inject({
      method: 'DELETE',
      url: '/pantry/chicken%20breast',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(204)
    expect(prismaMock.pantryItem.delete).toHaveBeenCalledWith({
      where: { userId_itemName: { userId: 'user-1', itemName: 'chicken breast' } },
    })
  })

  it('returns 404 when item does not exist', async () => {
    prismaMock.pantryItem.findUnique.mockResolvedValue(null)

    const res = await app.inject({
      method: 'DELETE',
      url: '/pantry/nonexistent',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(404)
  })

  it('returns 401 without auth', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/pantry/chicken%20breast',
    })
    expect(res.statusCode).toBe(401)
  })
})

// ── POST /pantry/sync-purchase ────────────────────────────────────────────────

describe('POST /pantry/sync-purchase', () => {
  it('upserts pantry item and writes PURCHASE ledger entry', async () => {
    const upserted = { ...mockPantryItem, quantity: 3.5, lastRestockedAt: new Date().toISOString() }
    prismaMock.pantryItem.upsert.mockResolvedValue(upserted)
    prismaMock.pantryLedger.create.mockResolvedValue({})

    const res = await app.inject({
      method: 'POST',
      url: '/pantry/sync-purchase',
      headers: authHeaders(),
      payload: { itemName: 'chicken breast', quantity: 1.5, unit: 'lb', storeName: 'HEB', purchaseId: 'purchase-1' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().item.quantity).toBe(3.5)
    expect(prismaMock.pantryItem.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_itemName: { userId: 'user-1', itemName: 'chicken breast' } },
        update: expect.objectContaining({
          quantity: { increment: 1.5 },
          lastRestockedAt: expect.any(Date),
        }),
        create: expect.objectContaining({
          userId: 'user-1',
          itemName: 'chicken breast',
          quantity: 1.5,
          unit: 'lb',
        }),
      })
    )
    expect(prismaMock.pantryLedger.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          delta: 1.5,
          unit: 'lb',
          action: 'PURCHASE',
          referenceId: 'purchase-1',
        }),
      })
    )
  })

  it('returns 400 when itemName is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/pantry/sync-purchase',
      headers: authHeaders(),
      payload: { quantity: 1.5, unit: 'lb', storeName: 'HEB' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 401 without auth', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/pantry/sync-purchase',
      payload: { itemName: 'eggs', quantity: 12, unit: 'each', storeName: 'HEB' },
    })
    expect(res.statusCode).toBe(401)
  })
})

// ── GET /pantry/check ─────────────────────────────────────────────────────────

describe('GET /pantry/check', () => {
  it('returns in-pantry status for each requested ingredient', async () => {
    prismaMock.pantryItem.findMany.mockResolvedValue([
      { itemName: 'chicken breast', quantity: 2.0, unit: 'lb' },
      { itemName: 'olive oil', quantity: 8, unit: 'tbsp' },
    ])

    const res = await app.inject({
      method: 'GET',
      url: '/pantry/check?ingredients=chicken+breast,olive+oil,garlic',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.coverage['chicken breast']).toMatchObject({ inPantry: true, quantity: 2.0, unit: 'lb' })
    expect(body.coverage['olive oil']).toMatchObject({ inPantry: true, quantity: 8, unit: 'tbsp' })
    expect(body.coverage['garlic']).toMatchObject({ inPantry: false })
  })

  it('returns all false when pantry is empty', async () => {
    prismaMock.pantryItem.findMany.mockResolvedValue([])

    const res = await app.inject({
      method: 'GET',
      url: '/pantry/check?ingredients=eggs,milk',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.coverage['eggs'].inPantry).toBe(false)
    expect(body.coverage['milk'].inPantry).toBe(false)
  })

  it('returns 400 when ingredients param is missing', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/pantry/check',
      headers: authHeaders(),
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 401 without auth', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/pantry/check?ingredients=eggs',
    })
    expect(res.statusCode).toBe(401)
  })
})
