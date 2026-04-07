import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { MealRecipe } from './mealPlanStore'

export type UserTier = 'FREE' | 'PLUS' | 'PRO'
export type SavedSort = 'recent' | 'mostCooked'

export interface SavedFavourite {
  recipeId: string
  recipe: MealRecipe
  savedAt: string
  timesCooked: number
  userRating: number | null
  notes: string
  collectionIds: string[]
}

export interface RecipeCollection {
  id: string
  name: string
  emoji: string
  recipeIds: string[]
  createdAt: string
}

interface SaveResult {
  ok: boolean
  error?: string
}

interface SaveCollectionResult extends SaveResult {
  collection?: RecipeCollection
}

interface SavedRecipesState {
  favourites: SavedFavourite[]
  collections: RecipeCollection[]
  saveFavourite: (recipe: MealRecipe, tier: UserTier) => SaveResult
  removeFavourite: (recipeId: string) => void
  isSaved: (recipeId: string) => boolean
  updateFavourite: (
    recipeId: string,
    updates: Partial<Pick<SavedFavourite, 'userRating' | 'notes' | 'timesCooked'>>
  ) => void
  createCollection: (name: string, emoji: string | undefined, tier: UserTier) => SaveCollectionResult
  renameCollection: (collectionId: string, name: string, emoji?: string) => void
  deleteCollection: (collectionId: string) => void
  addRecipeToCollection: (collectionId: string, recipeId: string) => void
  removeRecipeFromCollection: (collectionId: string, recipeId: string) => void
  getSortedFavourites: (sort: SavedSort) => SavedFavourite[]
  getCollectionRecipes: (collectionId: string) => SavedFavourite[]
  reset: () => void
}

const FREE_FAVOURITES_LIMIT = 10
const FREE_COLLECTIONS_LIMIT = 1

export const useSavedRecipesStore = create<SavedRecipesState>()(
  persist(
    (set, get) => ({
      favourites: [],
      collections: [],

      saveFavourite: (recipe, tier) => {
        if (get().isSaved(recipe.id)) {
          return { ok: true }
        }

        if (tier === 'FREE' && get().favourites.length >= FREE_FAVOURITES_LIMIT) {
          return { ok: false, error: 'Free users can save up to 10 favourites.' }
        }

        set((state) => ({
          favourites: [
            {
              recipeId: recipe.id,
              recipe,
              savedAt: new Date().toISOString(),
              timesCooked: 0,
              userRating: null,
              notes: '',
              collectionIds: [],
            },
            ...state.favourites,
          ],
        }))

        return { ok: true }
      },

      removeFavourite: (recipeId) =>
        set((state) => ({
          favourites: state.favourites.filter((favourite) => favourite.recipeId !== recipeId),
          collections: state.collections.map((collection) => ({
            ...collection,
            recipeIds: collection.recipeIds.filter((id) => id !== recipeId),
          })),
        })),

      isSaved: (recipeId) => get().favourites.some((favourite) => favourite.recipeId === recipeId),

      updateFavourite: (recipeId, updates) =>
        set((state) => ({
          favourites: state.favourites.map((favourite) =>
            favourite.recipeId === recipeId
              ? {
                  ...favourite,
                  ...(updates.userRating !== undefined ? { userRating: updates.userRating } : {}),
                  ...(updates.notes !== undefined ? { notes: updates.notes } : {}),
                  ...(updates.timesCooked !== undefined ? { timesCooked: updates.timesCooked } : {}),
                }
              : favourite
          ),
        })),

      createCollection: (name, emoji, tier) => {
        if (tier === 'FREE' && get().collections.length >= FREE_COLLECTIONS_LIMIT) {
          return { ok: false, error: 'Free users can create 1 collection.' }
        }

        const collection: RecipeCollection = {
          id: `collection-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: name.trim(),
          emoji: emoji?.trim() || '❤️',
          recipeIds: [],
          createdAt: new Date().toISOString(),
        }

        set((state) => ({ collections: [collection, ...state.collections] }))
        return { ok: true, collection }
      },

      renameCollection: (collectionId, name, emoji) =>
        set((state) => ({
          collections: state.collections.map((collection) =>
            collection.id === collectionId
              ? {
                  ...collection,
                  name: name.trim(),
                  ...(emoji !== undefined ? { emoji: emoji.trim() || collection.emoji } : {}),
                }
              : collection
          ),
        })),

      deleteCollection: (collectionId) =>
        set((state) => ({
          collections: state.collections.filter((collection) => collection.id !== collectionId),
          favourites: state.favourites.map((favourite) => ({
            ...favourite,
            collectionIds: favourite.collectionIds.filter((id) => id !== collectionId),
          })),
        })),

      addRecipeToCollection: (collectionId, recipeId) =>
        set((state) => ({
          collections: state.collections.map((collection) =>
            collection.id === collectionId && !collection.recipeIds.includes(recipeId)
              ? { ...collection, recipeIds: [...collection.recipeIds, recipeId] }
              : collection
          ),
          favourites: state.favourites.map((favourite) =>
            favourite.recipeId === recipeId && !favourite.collectionIds.includes(collectionId)
              ? { ...favourite, collectionIds: [...favourite.collectionIds, collectionId] }
              : favourite
          ),
        })),

      removeRecipeFromCollection: (collectionId, recipeId) =>
        set((state) => ({
          collections: state.collections.map((collection) =>
            collection.id === collectionId
              ? { ...collection, recipeIds: collection.recipeIds.filter((id) => id !== recipeId) }
              : collection
          ),
          favourites: state.favourites.map((favourite) =>
            favourite.recipeId === recipeId
              ? { ...favourite, collectionIds: favourite.collectionIds.filter((id) => id !== collectionId) }
              : favourite
          ),
        })),

      getSortedFavourites: (sort) => {
        const favourites = [...get().favourites]
        if (sort === 'mostCooked') {
          return favourites.sort((left, right) => {
            if (right.timesCooked !== left.timesCooked) {
              return right.timesCooked - left.timesCooked
            }
            return right.savedAt.localeCompare(left.savedAt)
          })
        }
        return favourites.sort((left, right) => right.savedAt.localeCompare(left.savedAt))
      },

      getCollectionRecipes: (collectionId) =>
        get().favourites.filter((favourite) => favourite.collectionIds.includes(collectionId)),

      reset: () => set({ favourites: [], collections: [] }),
    }),
    {
      name: 'saved-recipes-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        favourites: state.favourites,
        collections: state.collections,
      }),
    }
  )
)
