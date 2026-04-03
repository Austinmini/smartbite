import type { FastifyInstance } from 'fastify'
import { verifyJWT } from '../middleware/auth'
import { queryNearbyStores } from '../lib/mealme'
import type { MealMeStore } from '../data/txStores'
import { filterToV1Stores, TX_STORE_SEED } from '../data/txStores'

// Simple in-process cache: key = "lat:lng", value = { stores, cachedAt }
const cache = new Map<string, { stores: MealMeStore[]; cachedAt: number }>()
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24h

export async function storesRoute(app: FastifyInstance) {
  app.get<{ Querystring: { lat?: string; lng?: string } }>(
    '/nearby',
    {
      preHandler: verifyJWT,
      config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
    },
    async (request, reply) => {
      const { lat, lng } = request.query
      if (!lat || !lng) return reply.status(400).send({ error: 'lat and lng query params are required' })

      const latNum = parseFloat(lat)
      const lngNum = parseFloat(lng)
      if (isNaN(latNum) || isNaN(lngNum))
        return reply.status(400).send({ error: 'lat and lng must be valid numbers' })

      const cacheKey = `${latNum.toFixed(3)}:${lngNum.toFixed(3)}`
      const cached = cache.get(cacheKey)
      if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
        return reply.send({ stores: cached.stores, fallback: false, cached: true })
      }

      const raw = await queryNearbyStores(latNum, lngNum)
      const filtered = filterToV1Stores(raw).sort((a, b) => a.distanceMiles - b.distanceMiles)

      if (filtered.length === 0) {
        // Fall back to seed data with placeholder distances
        const seedStores = TX_STORE_SEED.map((s, i) => ({
          id: `seed-${s.chain}`,
          name: s.name,
          chain: s.chain,
          distanceMiles: i * 0.5 + 0.5,
          address: 'See store locator',
          lat: latNum,
          lng: lngNum,
        }))
        return reply.send({ stores: seedStores, fallback: true })
      }

      cache.set(cacheKey, { stores: filtered, cachedAt: Date.now() })
      return reply.send({ stores: filtered, fallback: false })
    }
  )
}
