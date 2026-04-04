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

const TIER_STORE_LIMITS = {
  FREE: 1,
  PLUS: 2,
  PRO: 2,
} as const

export async function pricesRoute(app: FastifyInstance) {
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

  app.get<{ Params: { planId: string } }>(
    '/shopping-list/:planId',
    {
      preHandler: verifyJWT,
      config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
    },
    async (request, reply) => {
      const userId = (request as any).userId as string

      try {
        const result = await buildShoppingList(userId, request.params.planId)
        return reply.status(200).send(result)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to build shopping list'
        if (message === 'Meal plan not found') {
          return reply.status(404).send({ error: message })
        }
        return reply.status(500).send({ error: message })
      }
    }
  )
}
