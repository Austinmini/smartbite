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

  prismaMock.collection = prismaMock.collection ?? {}
  prismaMock.favourite.findUnique = jest.fn()
  prismaMock.favourite.findMany = jest.fn()
  prismaMock.favourite.create = jest.fn()
  prismaMock.favourite.update = jest.fn()
  prismaMock.favourite.delete = jest.fn()
  prismaMock.favourite.count = jest.fn()

  prismaMock.collection.findUnique = jest.fn()
  prismaMock.collection.findFirst = jest.fn()
  prismaMock.collection.findMany = jest.fn()
  prismaMock.collection.create = jest.fn()
  prismaMock.collection.update = jest.fn()
  prismaMock.collection.delete = jest.fn()
  prismaMock.collection.count = jest.fn()

  prismaMock.user.findUnique = jest.fn()
  prismaMock.recipe.findUnique = jest.fn()
})

const authHeaders = () => ({ Authorization: `Bearer ${createAuthToken('user-1')}` })

describe('POST /favourites', () => {
  it('saves a recipe for an authenticated user', async () => {
    prismaMock.favourite.findUnique.mockResolvedValue(null)
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', tier: 'PLUS' })
    prismaMock.recipe.findUnique.mockResolvedValue({ id: 'recipe-1', title: 'Pesto Pasta' })
    prismaMock.favourite.create.mockResolvedValue({
      id: 'fav-1',
      userId: 'user-1',
      recipeId: 'recipe-1',
      savedAt: new Date('2026-04-06T12:00:00.000Z'),
      timesCooked: 0,
      userRating: null,
      notes: null,
      collectionIds: [],
    })

    const res = await app.inject({
      method: 'POST',
      url: '/favourites',
      headers: authHeaders(),
      payload: { recipeId: 'recipe-1' },
    })

    expect(res.statusCode).toBe(201)
    expect(res.json().favourite.recipeId).toBe('recipe-1')
  })

  it('returns 409 when the recipe is already saved', async () => {
    prismaMock.favourite.findUnique.mockResolvedValue({ id: 'fav-1', recipeId: 'recipe-1' })

    const res = await app.inject({
      method: 'POST',
      url: '/favourites',
      headers: authHeaders(),
      payload: { recipeId: 'recipe-1' },
    })

    expect(res.statusCode).toBe(409)
  })

  it('returns 403 when a free user has already saved 10 recipes', async () => {
    prismaMock.favourite.findUnique.mockResolvedValue(null)
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', tier: 'FREE' })
    prismaMock.favourite.count.mockResolvedValue(10)

    const res = await app.inject({
      method: 'POST',
      url: '/favourites',
      headers: authHeaders(),
      payload: { recipeId: 'recipe-11' },
    })

    expect(res.statusCode).toBe(403)
  })

  it('returns 400 when recipeId is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/favourites',
      headers: authHeaders(),
      payload: {},
    })

    expect(res.statusCode).toBe(400)
  })

  it('returns 401 without auth', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/favourites',
      payload: { recipeId: 'recipe-1' },
    })

    expect(res.statusCode).toBe(401)
  })
})

describe('DELETE /favourites/:recipeId', () => {
  it('deletes a saved recipe', async () => {
    prismaMock.favourite.delete.mockResolvedValue({ id: 'fav-1', recipeId: 'recipe-1' })

    const res = await app.inject({
      method: 'DELETE',
      url: '/favourites/recipe-1',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(204)
    expect(prismaMock.favourite.delete).toHaveBeenCalled()
  })
})

describe('PUT /favourites/:recipeId', () => {
  it('updates rating, notes, and timesCooked', async () => {
    prismaMock.favourite.findUnique.mockResolvedValue({ id: 'fav-1', userId: 'user-1', recipeId: 'recipe-1' })
    prismaMock.favourite.update.mockResolvedValue({
      id: 'fav-1',
      userId: 'user-1',
      recipeId: 'recipe-1',
      userRating: 5,
      notes: 'Family favourite',
      timesCooked: 4,
    })

    const res = await app.inject({
      method: 'PUT',
      url: '/favourites/recipe-1',
      headers: authHeaders(),
      payload: { userRating: 5, notes: 'Family favourite', timesCooked: 4 },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().favourite.userRating).toBe(5)
  })

  it('returns 400 for invalid rating', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/favourites/recipe-1',
      headers: authHeaders(),
      payload: { userRating: 6 },
    })

    expect(res.statusCode).toBe(400)
  })
})

describe('GET /favourites', () => {
  it('returns paginated favourites sorted by mostCooked', async () => {
    prismaMock.favourite.findMany.mockResolvedValue([
      { id: 'fav-2', recipeId: 'recipe-2', timesCooked: 8, savedAt: new Date('2026-04-05') },
      { id: 'fav-1', recipeId: 'recipe-1', timesCooked: 3, savedAt: new Date('2026-04-04') },
    ])
    prismaMock.favourite.count.mockResolvedValue(2)

    const res = await app.inject({
      method: 'GET',
      url: '/favourites?sort=mostCooked&limit=2&offset=0',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().total).toBe(2)
    expect(prismaMock.favourite.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
        take: 2,
        skip: 0,
        orderBy: [{ timesCooked: 'desc' }, { savedAt: 'desc' }],
      })
    )
  })
})

describe('GET /collections', () => {
  it('returns collections for the current user', async () => {
    prismaMock.collection.findMany.mockResolvedValue([
      { id: 'col-1', userId: 'user-1', name: 'Weeknight Wins', emoji: '🍝', recipeIds: ['recipe-1'] },
    ])

    const res = await app.inject({
      method: 'GET',
      url: '/collections',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().collections).toHaveLength(1)
  })
})

describe('POST /collections', () => {
  it('creates a collection', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', tier: 'PLUS' })
    prismaMock.collection.create.mockResolvedValue({
      id: 'col-1',
      userId: 'user-1',
      name: 'Meal Prep',
      emoji: '🥗',
      recipeIds: [],
      createdAt: new Date('2026-04-06T12:00:00.000Z'),
    })

    const res = await app.inject({
      method: 'POST',
      url: '/collections',
      headers: authHeaders(),
      payload: { name: 'Meal Prep', emoji: '🥗' },
    })

    expect(res.statusCode).toBe(201)
    expect(res.json().collection.name).toBe('Meal Prep')
  })

  it('returns 403 when a free user already has one collection', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', tier: 'FREE' })
    prismaMock.collection.count.mockResolvedValue(1)

    const res = await app.inject({
      method: 'POST',
      url: '/collections',
      headers: authHeaders(),
      payload: { name: 'Meal Prep' },
    })

    expect(res.statusCode).toBe(403)
  })
})

describe('PUT /collections/:id', () => {
  it('renames a collection and updates the emoji', async () => {
    prismaMock.collection.findUnique.mockResolvedValue({ id: 'col-1', userId: 'user-1' })
    prismaMock.collection.update.mockResolvedValue({
      id: 'col-1',
      userId: 'user-1',
      name: 'Dinner Ideas',
      emoji: '🍲',
      recipeIds: [],
    })

    const res = await app.inject({
      method: 'PUT',
      url: '/collections/col-1',
      headers: authHeaders(),
      payload: { name: 'Dinner Ideas', emoji: '🍲' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().collection.emoji).toBe('🍲')
  })
})

describe('DELETE /collections/:id', () => {
  it('deletes a collection', async () => {
    prismaMock.collection.delete.mockResolvedValue({ id: 'col-1' })

    const res = await app.inject({
      method: 'DELETE',
      url: '/collections/col-1',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(204)
  })
})

describe('POST /collections/:id/recipes', () => {
  it('adds a recipe to a collection and favourite', async () => {
    prismaMock.collection.findUnique.mockResolvedValue({
      id: 'col-1',
      userId: 'user-1',
      recipeIds: [],
    })
    prismaMock.favourite.findUnique.mockResolvedValue({
      id: 'fav-1',
      userId: 'user-1',
      recipeId: 'recipe-1',
      collectionIds: [],
    })
    prismaMock.collection.update.mockResolvedValue({
      id: 'col-1',
      userId: 'user-1',
      recipeIds: ['recipe-1'],
    })
    prismaMock.favourite.update.mockResolvedValue({
      id: 'fav-1',
      userId: 'user-1',
      recipeId: 'recipe-1',
      collectionIds: ['col-1'],
    })

    const res = await app.inject({
      method: 'POST',
      url: '/collections/col-1/recipes',
      headers: authHeaders(),
      payload: { recipeId: 'recipe-1' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().collection.recipeIds).toContain('recipe-1')
  })
})

describe('DELETE /collections/:id/recipes/:recipeId', () => {
  it('removes a recipe from a collection and favourite', async () => {
    prismaMock.collection.findUnique.mockResolvedValue({
      id: 'col-1',
      userId: 'user-1',
      recipeIds: ['recipe-1'],
    })
    prismaMock.favourite.findUnique.mockResolvedValue({
      id: 'fav-1',
      userId: 'user-1',
      recipeId: 'recipe-1',
      collectionIds: ['col-1'],
    })
    prismaMock.collection.update.mockResolvedValue({
      id: 'col-1',
      userId: 'user-1',
      recipeIds: [],
    })
    prismaMock.favourite.update.mockResolvedValue({
      id: 'fav-1',
      userId: 'user-1',
      recipeId: 'recipe-1',
      collectionIds: [],
    })

    const res = await app.inject({
      method: 'DELETE',
      url: '/collections/col-1/recipes/recipe-1',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().collection.recipeIds).toEqual([])
  })
})
