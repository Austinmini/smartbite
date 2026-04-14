import type { FastifyInstance } from 'fastify'
import { verifyJWT } from '../middleware/auth'
import { prisma } from '../lib/prisma'
import {
  buildShoppingList,
  getRecipeForPlan,
  getUserScanStores,
  persistBestStore,
  scanPrices,
} from '../services/pricingService'
import { awardBites, processScanReward } from '../services/rewardsService'
import { getPriceTrend, getAiPriceSuggestion } from '../services/priceTrendService'
import { markActionComplete } from '../services/onboardingService'

const TIER_STORE_LIMITS = {
  FREE: 1,
  PLUS: 2,
  PRO: 2,
} as const

export async function pricesRoute(app: FastifyInstance) {
  app.get(
    '/calibration-status',
    {
      preHandler: verifyJWT,
      config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    },
    async (request, reply) => {
      const userId = (request as any).userId as string
      const stapleTargets = ['eggs', 'milk', 'bread', 'rice', 'chicken']
      const observations = await prisma.priceObservation.findMany({
        where: { userId, scannedAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120) } },
        select: { productName: true, upc: true },
        take: 500,
      })

      const matchedStaples = new Set<string>()
      const uniqueUpcs = new Set<string>()

      for (const observation of observations) {
        uniqueUpcs.add(observation.upc)
        const product = observation.productName?.toLowerCase() ?? ''
        for (const staple of stapleTargets) {
          if (product.includes(staple)) matchedStaples.add(staple)
        }
      }

      const progressCount = Math.min(5, Math.max(matchedStaples.size, Math.min(5, uniqueUpcs.size)))
      const missingStaples = stapleTargets.filter((staple) => !matchedStaples.has(staple))

      return reply.status(200).send({
        complete: progressCount >= 5,
        progressCount,
        targetCount: 5,
        missingStaples: missingStaples.slice(0, 3),
      })
    }
  )

  app.get<{ Querystring: { recipeId?: string; planId?: string } }>(
    '/scan',
    {
      preHandler: verifyJWT,
      config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    },
    async (request, reply) => {
      const userId = (request as any).userId as string
      const { recipeId, planId } = request.query

      if (!recipeId || !planId) {
        return reply.status(400).send({ error: 'recipeId and planId are required' })
      }

      const [user, profile, meal] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { tier: true } }),
        prisma.userProfile.findUnique({
          where: { userId },
          select: { preferredRetailers: true, selectedStores: true, maxStores: true },
        }),
        getRecipeForPlan(userId, planId, recipeId),
      ])

      if (!user) return reply.status(401).send({ error: 'User not found' })
      if (!profile) return reply.status(400).send({ error: 'Complete your profile to scan prices' })
      if (!meal) return reply.status(404).send({ error: 'Recipe not found in this plan' })

      const tierLimit = TIER_STORE_LIMITS[user.tier as keyof typeof TIER_STORE_LIMITS] ?? 1
      const requestedStores = Math.min(profile.maxStores ?? 1, profile.preferredRetailers.length)

      if (requestedStores > tierLimit) {
        return reply.status(403).send({
          error: `Your current plan supports scanning up to ${tierLimit} store${tierLimit === 1 ? '' : 's'} at a time`,
        })
      }

      const stores = getUserScanStores(profile).slice(0, requestedStores)
      const result = await scanPrices({
        recipeId,
        ingredients: meal.recipe.ingredients,
        stores,
        maxStores: requestedStores,
      })

      if (result.hasAnyPrices) {
        await persistBestStore(meal.id, result.bestSingleStore.storeName)
      }
      return reply.status(200).send(result)
    }
  )

  // ── POST /prices/observation ─────────────────────────────────────────────────

  app.post<{
    Body: {
      upc?: string
      productName?: string
      storeId?: string
      storeName?: string
      storeLocation?: unknown
      price?: number
      unitSize?: string
    }
  }>(
    '/observation',
    {
      preHandler: verifyJWT,
      config: { rateLimit: { max: 50, timeWindow: '24 hours' } },
    },
    async (request, reply) => {
      const userId = (request as any).userId as string
      const { upc, productName, storeId, storeName, storeLocation, price, unitSize } = request.body ?? {}

      if (!upc || typeof upc !== 'string') {
        return reply.status(400).send({ error: 'upc is required' })
      }
      if (!storeId || typeof storeId !== 'string') {
        return reply.status(400).send({ error: 'storeId is required' })
      }
      if (!storeName || typeof storeName !== 'string') {
        return reply.status(400).send({ error: 'storeName is required' })
      }
      if (typeof price !== 'number' || price < 0) {
        return reply.status(400).send({ error: 'price must be a non-negative number' })
      }
      if (!storeLocation) {
        return reply.status(400).send({ error: 'storeLocation is required' })
      }

      const observation = await prisma.priceObservation.create({
        data: {
          upc,
          productName: typeof productName === 'string' ? productName : null,
          storeId,
          storeName,
          storeLocation: storeLocation as object,
          price,
          unitSize: unitSize ?? null,
          userId,
        },
      })

      const bites = await processScanReward(userId, observation as any)
      let impactBonus = 0
      const normalizedProductName = typeof productName === 'string' ? productName.trim().toLowerCase() : ''
      if (normalizedProductName.length > 0) {
        const previousCoverage = await prisma.priceObservation.count({
          where: {
            storeId,
            id: { not: observation.id },
            productName: { contains: normalizedProductName, mode: 'insensitive' },
            scannedAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120) },
          },
        })
        if (previousCoverage === 0) {
          impactBonus = 3
          await awardBites(userId, impactBonus, 'PRICE_SCAN', observation.id)
          bites.totalAwarded += impactBonus
          bites.breakdown.push({ amount: impactBonus, reason: 'PRICE_SCAN' })
        }
      }
      await markActionComplete(userId, 'first_scan')

      return reply.status(201).send({ observationId: observation.id, bites, impactBonus })
    }
  )

  // ── GET /prices/trends ────────────────────────────────────────────────────────

  app.get<{ Querystring: { ingredient?: string; storeId?: string; days?: string } }>(
    '/trends',
    {
      preHandler: verifyJWT,
      config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
    },
    async (request, reply) => {
      const userId = (request as any).userId as string
      const { ingredient, storeId, days } = request.query

      if (!ingredient) return reply.status(400).send({ error: 'ingredient is required' })
      if (!storeId) return reply.status(400).send({ error: 'storeId is required' })

      const user = await prisma.user.findUnique({ where: { id: userId }, select: { tier: true } })
      if (!user) return reply.status(401).send({ error: 'User not found' })
      if (user.tier !== 'PRO') return reply.status(403).send({ error: 'Price trends require a Pro subscription' })

      const trends = await getPriceTrend({
        ingredient,
        storeId,
        days: days ? parseInt(days, 10) : 30,
      })

      return reply.status(200).send({ trends })
    }
  )

  // ── GET /prices/suggestion ────────────────────────────────────────────────────

  app.get<{ Querystring: { ingredient?: string; storeId?: string } }>(
    '/suggestion',
    {
      preHandler: verifyJWT,
      config: { rateLimit: { max: 20, timeWindow: '1 hour' } },
    },
    async (request, reply) => {
      const userId = (request as any).userId as string
      const { ingredient, storeId } = request.query

      if (!ingredient) return reply.status(400).send({ error: 'ingredient is required' })
      if (!storeId) return reply.status(400).send({ error: 'storeId is required' })

      const user = await prisma.user.findUnique({ where: { id: userId }, select: { tier: true } })
      if (!user) return reply.status(401).send({ error: 'User not found' })
      if (user.tier !== 'PRO') return reply.status(403).send({ error: 'AI price suggestions require a Pro subscription' })

      const trendData = await getPriceTrend({ ingredient, storeId, days: 30 })
      const suggestion = await getAiPriceSuggestion({ ingredient, storeId, trendData })

      return reply.status(200).send(suggestion)
    }
  )

  // ── POST /prices/alert ────────────────────────────────────────────────────────

  app.post<{ Body: { recipeId?: string; targetPrice?: number } }>(
    '/alert',
    {
      preHandler: verifyJWT,
      config: { rateLimit: { max: 20, timeWindow: '1 hour' } },
    },
    async (request, reply) => {
      const userId = (request as any).userId as string
      const { recipeId, targetPrice } = request.body ?? {}

      if (!recipeId) return reply.status(400).send({ error: 'recipeId is required' })
      if (typeof targetPrice !== 'number' || targetPrice < 0)
        return reply.status(400).send({ error: 'targetPrice must be a non-negative number' })

      const user = await prisma.user.findUnique({ where: { id: userId }, select: { tier: true } })
      if (!user) return reply.status(401).send({ error: 'User not found' })
      if (user.tier === 'FREE') return reply.status(403).send({ error: 'Price alerts require Plus or Pro subscription' })

      const alert = await prisma.priceAlert.create({
        data: { userId, recipeId, targetPrice },
      })

      return reply.status(201).send(alert)
    }
  )

  // ── GET /prices/alerts ────────────────────────────────────────────────────────

  app.get(
    '/alerts',
    {
      preHandler: verifyJWT,
      config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    },
    async (request, reply) => {
      const userId = (request as any).userId as string

      const user = await prisma.user.findUnique({ where: { id: userId }, select: { tier: true } })
      if (!user) return reply.status(401).send({ error: 'User not found' })
      if (user.tier === 'FREE') return reply.status(403).send({ error: 'Price alerts require Plus or Pro subscription' })

      const alerts = await prisma.priceAlert.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      })

      return reply.status(200).send({ alerts })
    }
  )

  // ── DELETE /prices/alerts/:id ─────────────────────────────────────────────────

  app.delete<{ Params: { id: string } }>(
    '/alerts/:id',
    { preHandler: verifyJWT, config: { rateLimit: { max: 50, timeWindow: '1 hour' } } },
    async (request, reply) => {
      const userId = (request as any).userId as string

      const alert = await prisma.priceAlert.findFirst({
        where: { id: request.params.id, userId },
      })
      if (!alert) return reply.status(404).send({ error: 'Alert not found' })

      await prisma.priceAlert.delete({ where: { id: request.params.id } })
      return reply.status(200).send({ success: true })
    }
  )

  // ── GET /prices/shopping-list/:planId ────────────────────────────────────────

  app.get<{ Params: { planId: string }; Querystring: { recipeId?: string } }>(
    '/shopping-list/:planId',
    {
      preHandler: verifyJWT,
      config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
    },
    async (request, reply) => {
      const userId = (request as any).userId as string
      const { recipeId } = request.query

      try {
        const result = await buildShoppingList(userId, request.params.planId, recipeId)
        return reply.status(200).send(result)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to build shopping list'
        if (message === 'Meal plan not found' || message === 'Recipe not found in this plan') {
          return reply.status(404).send({ error: message })
        }
        return reply.status(500).send({ error: message })
      }
    }
  )
}
