jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}))

import AsyncStorage from '@react-native-async-storage/async-storage'
import { useProductCacheStore } from '../productCacheStore'

const mockProduct = {
  upc: '012345678901',
  name: 'Organic Whole Milk',
  brand: 'Horizon',
  imageUrl: 'https://example.com/milk.jpg',
  unitSize: '1 gallon',
  category: 'GROCERY' as const,
  cachedAt: Date.now(),
}

beforeEach(() => {
  useProductCacheStore.setState({ products: {} })
  jest.clearAllMocks()
})

describe('productCacheStore', () => {
  it('adds a product to the cache', () => {
    useProductCacheStore.getState().setProduct(mockProduct.upc, mockProduct)
    const result = useProductCacheStore.getState().getProduct(mockProduct.upc)
    expect(result).toMatchObject({ name: 'Organic Whole Milk' })
  })

  it('returns undefined for uncached UPC', () => {
    const result = useProductCacheStore.getState().getProduct('000000000000')
    expect(result).toBeUndefined()
  })

  it('returns undefined for expired entry (>30 days)', () => {
    const thirtyOneDaysAgo = Date.now() - 31 * 24 * 60 * 60 * 1000
    const staleProduct = { ...mockProduct, cachedAt: thirtyOneDaysAgo }
    useProductCacheStore.setState({ products: { [mockProduct.upc]: staleProduct } })
    const result = useProductCacheStore.getState().getProduct(mockProduct.upc)
    expect(result).toBeUndefined()
  })

  it('returns product for entry within 30 days', () => {
    const twentyDaysAgo = Date.now() - 20 * 24 * 60 * 60 * 1000
    const freshProduct = { ...mockProduct, cachedAt: twentyDaysAgo }
    useProductCacheStore.setState({ products: { [mockProduct.upc]: freshProduct } })
    const result = useProductCacheStore.getState().getProduct(mockProduct.upc)
    expect(result).toMatchObject({ name: 'Organic Whole Milk' })
  })

  it('evicts oldest entries when cache exceeds 500 items', () => {
    const products: Record<string, typeof mockProduct> = {}
    for (let i = 0; i < 500; i++) {
      products[`upc-${i}`] = { ...mockProduct, upc: `upc-${i}`, cachedAt: Date.now() - i * 1000 }
    }
    useProductCacheStore.setState({ products })
    // Add one more
    useProductCacheStore.getState().setProduct('upc-new', { ...mockProduct, upc: 'upc-new', cachedAt: Date.now() })
    const state = useProductCacheStore.getState()
    expect(Object.keys(state.products).length).toBeLessThanOrEqual(500)
    // New item should be present
    expect(state.products['upc-new']).toBeDefined()
    // Oldest item (upc-499, which has the oldest cachedAt) should be evicted
    expect(state.products['upc-499']).toBeUndefined()
  })

  it('clears all products', () => {
    useProductCacheStore.getState().setProduct(mockProduct.upc, mockProduct)
    useProductCacheStore.getState().clearCache()
    expect(Object.keys(useProductCacheStore.getState().products).length).toBe(0)
  })
})
