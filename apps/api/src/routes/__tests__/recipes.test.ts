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

// Shared recipe fixture — 2 servings, 3 ingredients
const mockRecipe = {
  id: 'recipe-1',
  servings: 2,
  ingredients: [
    { name: 'chicken breast', amount: 1.0, unit: 'lb' },
    { name: 'olive oil',      amount: 2,   unit: 'tbsp' },
    { name: 'garlic',         amount: 3,   unit: 'cloves' },
  ],
}

// ── POST /recipes/:id/cooked ──────────────────────────────────────────────────

describe('POST /recipes/:id/cooked', () => {
  it('deducts scaled ingredient quantities from pantry and returns deductions', async () => {
    // Cooking for 4 servings (2× the recipe's 2 servings → scale = 2)
    prismaMock.recipe.findUnique.mockResolvedValue(mockRecipe)
    prismaMock.pantryItem.findUnique
      .mockResolvedValueOnce({ id: 'pi-1', itemName: 'chicken breast', quantity: 3.0, unit: 'lb' })
      .mockResolvedValueOnce({ id: 'pi-2', itemName: 'olive oil',      quantity: 10,  unit: 'tbsp' })
      .mockResolvedValueOnce(null) // garlic not in pantry
    prismaMock.pantryItem.update.mockImplementation(({ data }: any) =>
      Promise.resolve({ quantity: data.quantity })
    )
    prismaMock.pantryLedger.create.mockResolvedValue({})
    prismaMock.favourite.findUnique.mockResolvedValue(null) // not saved

    const res = await app.inject({
      method: 'POST',
      url: '/recipes/recipe-1/cooked',
      headers: authHeaders(),
      payload: { servings: 4 },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()

    // chicken breast: 1.0 lb × (4/2) = 2.0 lb deducted, 1.0 remaining
    expect(body.deductions).toContainEqual(
      expect.objectContaining({ ingredientName: 'chicken breast', deducted: 2.0, unit: 'lb', remaining: 1.0 })
    )
    // olive oil: 2 tbsp × (4/2) = 4 tbsp deducted, 6 remaining
    expect(body.deductions).toContainEqual(
      expect.objectContaining({ ingredientName: 'olive oil', deducted: 4, unit: 'tbsp', remaining: 6 })
    )
    // garlic: not in pantry → in missingFromPantry
    expect(body.missingFromPantry).toContain('garlic')
  })

  it('clamps pantry quantity to 0 when deduction exceeds stock', async () => {
    // Cooking 1 serving, chicken breast only — but pantry has only 0.3 lb, needs 0.5 lb
    const smallRecipe = {
      id: 'recipe-2',
      servings: 2,
      ingredients: [{ name: 'chicken breast', amount: 1.0, unit: 'lb' }],
    }
    prismaMock.recipe.findUnique.mockResolvedValue(smallRecipe)
    prismaMock.pantryItem.findUnique.mockResolvedValue({ id: 'pi-1', itemName: 'chicken breast', quantity: 0.3, unit: 'lb' })
    prismaMock.pantryItem.update.mockResolvedValue({ quantity: 0 })
    prismaMock.pantryLedger.create.mockResolvedValue({})
    prismaMock.favourite.findUnique.mockResolvedValue(null)

    const res = await app.inject({
      method: 'POST',
      url: '/recipes/recipe-2/cooked',
      headers: authHeaders(),
      payload: { servings: 1 },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    // deducted only what was available (0.3), remaining = 0
    expect(body.deductions[0]).toMatchObject({ ingredientName: 'chicken breast', deducted: 0.3, remaining: 0 })
    // clamped — not in missingFromPantry (item existed, just ran out)
    expect(body.missingFromPantry).not.toContain('chicken breast')

    // update called with quantity: 0
    expect(prismaMock.pantryItem.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ quantity: 0 }) })
    )
  })

  it('adds ingredients not in pantry at all to missingFromPantry', async () => {
    prismaMock.recipe.findUnique.mockResolvedValue(mockRecipe)
    prismaMock.pantryItem.findUnique.mockResolvedValue(null) // nothing in pantry
    prismaMock.pantryLedger.create.mockResolvedValue({})
    prismaMock.favourite.findUnique.mockResolvedValue(null)

    const res = await app.inject({
      method: 'POST',
      url: '/recipes/recipe-1/cooked',
      headers: authHeaders(),
      payload: { servings: 2 },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.missingFromPantry).toEqual(
      expect.arrayContaining(['chicken breast', 'olive oil', 'garlic'])
    )
    expect(body.deductions).toHaveLength(0)
  })

  it('writes a RECIPE_COOKED pantry ledger entry for each deducted ingredient', async () => {
    prismaMock.recipe.findUnique.mockResolvedValue({
      id: 'recipe-3',
      servings: 2,
      ingredients: [{ name: 'eggs', amount: 2, unit: 'each' }],
    })
    prismaMock.pantryItem.findUnique.mockResolvedValue({ id: 'pi-3', itemName: 'eggs', quantity: 6, unit: 'each' })
    prismaMock.pantryItem.update.mockResolvedValue({ quantity: 4 })
    prismaMock.pantryLedger.create.mockResolvedValue({})
    prismaMock.favourite.findUnique.mockResolvedValue(null)

    await app.inject({
      method: 'POST',
      url: '/recipes/recipe-3/cooked',
      headers: authHeaders(),
      payload: { servings: 2 },
    })

    expect(prismaMock.pantryLedger.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'RECIPE_COOKED',
          delta: -2, // negative = used
          unit: 'each',
        }),
      })
    )
  })

  it('includes planMealId as referenceId in the ledger entry when provided', async () => {
    prismaMock.recipe.findUnique.mockResolvedValue({
      id: 'recipe-4',
      servings: 1,
      ingredients: [{ name: 'butter', amount: 1, unit: 'tbsp' }],
    })
    prismaMock.pantryItem.findUnique.mockResolvedValue({ id: 'pi-4', itemName: 'butter', quantity: 5, unit: 'tbsp' })
    prismaMock.pantryItem.update.mockResolvedValue({ quantity: 4 })
    prismaMock.pantryLedger.create.mockResolvedValue({})
    prismaMock.favourite.findUnique.mockResolvedValue(null)

    await app.inject({
      method: 'POST',
      url: '/recipes/recipe-4/cooked',
      headers: authHeaders(),
      payload: { servings: 1, planMealId: 'meal-abc' },
    })

    expect(prismaMock.pantryLedger.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ referenceId: 'meal-abc' }),
      })
    )
  })

  it('increments timesCooked on Favourite when recipe is saved by the user', async () => {
    prismaMock.recipe.findUnique.mockResolvedValue({
      id: 'recipe-5',
      servings: 2,
      ingredients: [{ name: 'rice', amount: 1, unit: 'cup' }],
    })
    prismaMock.pantryItem.findUnique.mockResolvedValue(null) // no pantry needed for this test
    prismaMock.pantryLedger.create.mockResolvedValue({})
    prismaMock.favourite.findUnique.mockResolvedValue({ id: 'fav-1', timesCooked: 3 })
    prismaMock.favourite.update.mockResolvedValue({ id: 'fav-1', timesCooked: 4 })

    const res = await app.inject({
      method: 'POST',
      url: '/recipes/recipe-5/cooked',
      headers: authHeaders(),
      payload: { servings: 2 },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().timesCooked).toBe(4)
    expect(prismaMock.favourite.update).toHaveBeenCalledWith({
      where: { userId_recipeId: { userId: 'user-1', recipeId: 'recipe-5' } },
      data: { timesCooked: { increment: 1 } },
    })
  })

  it('returns timesCooked: 0 when recipe is not saved', async () => {
    prismaMock.recipe.findUnique.mockResolvedValue({
      id: 'recipe-6',
      servings: 2,
      ingredients: [],
    })
    prismaMock.favourite.findUnique.mockResolvedValue(null)

    const res = await app.inject({
      method: 'POST',
      url: '/recipes/recipe-6/cooked',
      headers: authHeaders(),
      payload: { servings: 2 },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().timesCooked).toBe(0)
    expect(prismaMock.favourite.update).not.toHaveBeenCalled()
  })

  it('returns 404 when recipe does not exist', async () => {
    prismaMock.recipe.findUnique.mockResolvedValue(null)

    const res = await app.inject({
      method: 'POST',
      url: '/recipes/nonexistent/cooked',
      headers: authHeaders(),
      payload: { servings: 2 },
    })

    expect(res.statusCode).toBe(404)
  })

  it('returns 400 when servings is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/recipes/recipe-1/cooked',
      headers: authHeaders(),
      payload: {},
    })

    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when servings is zero or negative', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/recipes/recipe-1/cooked',
      headers: authHeaders(),
      payload: { servings: 0 },
    })

    expect(res.statusCode).toBe(400)
  })

  it('returns 401 without auth', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/recipes/recipe-1/cooked',
      payload: { servings: 2 },
    })

    expect(res.statusCode).toBe(401)
  })
})
