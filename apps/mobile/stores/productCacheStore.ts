import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

const MAX_CACHE_SIZE = 500
const TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export interface CachedProduct {
  upc: string
  name: string
  brand: string | null
  imageUrl: string | null
  unitSize: string | null
  category: string
  cachedAt: number
}

interface ProductCacheState {
  products: Record<string, CachedProduct>
  getProduct: (upc: string) => CachedProduct | undefined
  setProduct: (upc: string, product: CachedProduct) => void
  clearCache: () => void
}

export const useProductCacheStore = create<ProductCacheState>()(
  persist(
    (set, get) => ({
      products: {},

      getProduct: (upc: string) => {
        const product = get().products[upc]
        if (!product) return undefined
        if (Date.now() - product.cachedAt > TTL_MS) return undefined
        return product
      },

      setProduct: (upc: string, product: CachedProduct) => {
        set((state) => {
          const updated = { ...state.products, [upc]: product }
          const entries = Object.entries(updated)

          if (entries.length > MAX_CACHE_SIZE) {
            // Evict oldest entries (by cachedAt) to keep at MAX_CACHE_SIZE
            entries.sort((a, b) => b[1].cachedAt - a[1].cachedAt)
            const trimmed = entries.slice(0, MAX_CACHE_SIZE)
            return { products: Object.fromEntries(trimmed) }
          }

          return { products: updated }
        })
      },

      clearCache: () => set({ products: {} }),
    }),
    {
      name: 'product-cache-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ products: state.products }),
    }
  )
)
