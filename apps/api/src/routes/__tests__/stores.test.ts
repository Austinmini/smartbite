import '../../test/mocks/prisma'
import '../../test/mocks/supabase'
import { buildApp } from '../../app'
import { createAuthToken } from '../../test/factories'

// Mock the MealMe client so no real HTTP calls happen
jest.mock('../../lib/mealme', () => ({
  queryNearbyStores: jest.fn(),
}))
import { queryNearbyStores } from '../../lib/mealme'
const mealMeMock = queryNearbyStores as jest.Mock

let app: Awaited<ReturnType<typeof buildApp>>

beforeAll(async () => {
  app = await buildApp()
  await app.ready()
})
afterAll(async () => { await app.close() })
beforeEach(() => { jest.clearAllMocks() })

const authHeaders = () => ({ Authorization: `Bearer ${createAuthToken('user-1')}` })

const MEALME_STORES = [
  { id: 's1', name: 'HEB - South Congress', chain: 'heb', distanceMiles: 0.8, address: '123 S Congress Ave', lat: 30.25, lng: -97.75 },
  { id: 's2', name: 'Walmart Supercenter', chain: 'walmart', distanceMiles: 1.2, address: '456 Ben White Blvd', lat: 30.23, lng: -97.78 },
  { id: 's3', name: 'Target', chain: 'target', distanceMiles: 0.5, address: '789 Lamar Blvd', lat: 30.26, lng: -97.74 },
]

describe('GET /stores/nearby', () => {
  // Each test uses distinct coordinates to avoid in-process cache collisions

  it('returns stores sorted by distance filtered to V1 chains', async () => {
    mealMeMock.mockResolvedValue(MEALME_STORES)

    const res = await app.inject({ method: 'GET', url: '/stores/nearby?lat=30.100&lng=-97.100', headers: authHeaders() })

    expect(res.statusCode).toBe(200)
    expect(res.json().stores).toHaveLength(2) // Target filtered out
    expect(res.json().stores[0].chain).toBe('heb') // sorted by distance
    expect(res.json().stores[1].chain).toBe('walmart')
  })

  it('returns cached result on second call within 24h', async () => {
    mealMeMock.mockResolvedValue(MEALME_STORES)

    await app.inject({ method: 'GET', url: '/stores/nearby?lat=30.200&lng=-97.200', headers: authHeaders() })
    await app.inject({ method: 'GET', url: '/stores/nearby?lat=30.200&lng=-97.200', headers: authHeaders() })

    // MealMe should only be called once (second response from cache)
    expect(mealMeMock).toHaveBeenCalledTimes(1)
  })

  it('falls back to TX_STORE_SEED if MealMe returns empty', async () => {
    mealMeMock.mockResolvedValue([])

    const res = await app.inject({ method: 'GET', url: '/stores/nearby?lat=30.300&lng=-97.300', headers: authHeaders() })

    expect(res.statusCode).toBe(200)
    expect(res.json().stores.length).toBeGreaterThan(0)
    expect(res.json().fallback).toBe(true)
  })

  it('returns 400 if lat or lng are missing', async () => {
    const res = await app.inject({ method: 'GET', url: '/stores/nearby?lat=30.400', headers: authHeaders() })

    expect(res.statusCode).toBe(400)
  })

  it('returns 401 without auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/stores/nearby?lat=30.500&lng=-97.500' })
    expect(res.statusCode).toBe(401)
  })
})
