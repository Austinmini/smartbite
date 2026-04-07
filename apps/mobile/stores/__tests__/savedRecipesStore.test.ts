jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}))

import { useSavedRecipesStore } from '../savedRecipesStore'

const recipe = {
  id: 'recipe-1',
  title: 'Pesto Pasta',
  readyInMinutes: 20,
  servings: 2,
  ingredients: [{ name: 'pasta', amount: 1, unit: 'box' }],
  instructions: [{ step: 1, text: 'Boil pasta.' }],
  nutrition: { calories: 520, protein: 18, carbs: 72, fat: 16 },
  tags: ['vegetarian'],
  imageUrl: null,
}

beforeEach(() => {
  useSavedRecipesStore.getState().reset()
})

describe('savedRecipesStore', () => {
  it('saves a favourite recipe', () => {
    const result = useSavedRecipesStore.getState().saveFavourite(recipe, 'PLUS')

    expect(result.ok).toBe(true)
    expect(useSavedRecipesStore.getState().favourites).toHaveLength(1)
    expect(useSavedRecipesStore.getState().isSaved('recipe-1')).toBe(true)
  })

  it('blocks free users after 10 favourites', () => {
    for (let index = 0; index < 10; index += 1) {
      useSavedRecipesStore.getState().saveFavourite(
        { ...recipe, id: `recipe-${index}`, title: `Recipe ${index}` },
        'FREE'
      )
    }

    const result = useSavedRecipesStore.getState().saveFavourite(
      { ...recipe, id: 'recipe-11', title: 'Recipe 11' },
      'FREE'
    )

    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/10 favourites/i)
  })

  it('creates one collection for free users and blocks a second', () => {
    const first = useSavedRecipesStore.getState().createCollection('Weeknight', '🍝', 'FREE')
    const second = useSavedRecipesStore.getState().createCollection('Meal Prep', '🥗', 'FREE')

    expect(first.ok).toBe(true)
    expect(second.ok).toBe(false)
    expect(second.error).toMatch(/1 collection/i)
  })

  it('sorts favourites by times cooked', () => {
    useSavedRecipesStore.getState().saveFavourite({ ...recipe, id: 'recipe-1', title: 'One' }, 'PLUS')
    useSavedRecipesStore.getState().saveFavourite({ ...recipe, id: 'recipe-2', title: 'Two' }, 'PLUS')
    useSavedRecipesStore.getState().updateFavourite('recipe-1', { timesCooked: 2 })
    useSavedRecipesStore.getState().updateFavourite('recipe-2', { timesCooked: 5 })

    const sorted = useSavedRecipesStore.getState().getSortedFavourites('mostCooked')

    expect(sorted[0].recipeId).toBe('recipe-2')
    expect(sorted[1].recipeId).toBe('recipe-1')
  })

  it('updates rating, notes, times cooked, and collection membership', () => {
    useSavedRecipesStore.getState().saveFavourite(recipe, 'PLUS')
    const collection = useSavedRecipesStore.getState().createCollection('Weeknight', '🍝', 'PLUS')
    useSavedRecipesStore.getState().addRecipeToCollection(collection.collection!.id, 'recipe-1')
    useSavedRecipesStore.getState().updateFavourite('recipe-1', {
      userRating: 4,
      notes: 'Great weeknight dinner',
      timesCooked: 3,
    })

    const favourite = useSavedRecipesStore.getState().favourites[0]
    const collections = useSavedRecipesStore.getState().collections[0]

    expect(favourite.userRating).toBe(4)
    expect(favourite.notes).toBe('Great weeknight dinner')
    expect(favourite.timesCooked).toBe(3)
    expect(favourite.collectionIds).toContain(collection.collection!.id)
    expect(collections.recipeIds).toContain('recipe-1')
  })
})
