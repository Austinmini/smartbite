import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { verifyJWT } from '../middleware/auth'
import { addDays, differenceInDays } from 'date-fns'

type Tier = 'FREE' | 'PLUS' | 'PRO'
const VALID_TIERS: Tier[] = ['FREE', 'PLUS', 'PRO']

// Derive tier from RevenueCat product_id
function tierFromProductId(productId: string, periodType: string): Tier {
  if (periodType === 'TRIAL') return 'PRO'
  if (productId.includes('.pro.')) return 'PRO'
  if (productId.includes('.plus.')) return 'PLUS'
  return 'FREE'
}

export async function subscriptionRoute(app: FastifyInstance) {
  // GET /subscription/status
  app.get(
    '/status',
    { preHandler: verifyJWT, config: { rateLimit: { max: 60, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const user = await prisma.user.findUnique({
        where: { id: request.userId },
        select: { tier: true, trialEndsAt: true, hasUsedTrial: true, revenueCatUserId: true },
      })
      if (!user) return reply.status(404).send({ error: 'User not found' })

      const now = new Date()
      const isTrial =
        user.trialEndsAt !== null &&
        user.trialEndsAt > now &&
        user.revenueCatUserId === null

      const daysRemaining = isTrial
        ? Math.max(0, differenceInDays(user.trialEndsAt!, now))
        : null

      return reply.send({
        tier: user.tier,
        isTrial,
        trialEndsAt: isTrial ? user.trialEndsAt : null,
        daysRemaining,
        renewalDate: null, // RevenueCat provides this — not stored in DB currently
        limits: TIER_LIMITS[user.tier as Tier],
      })
    }
  )

  // POST /subscription/sync — called from mobile on every launch
  app.post<{ Body: { tier: Tier; isTrialPeriod?: boolean } }>(
    '/sync',
    { preHandler: verifyJWT, config: { rateLimit: { max: 10, timeWindow: '1 hour' } } },
    async (request, reply) => {
      const { tier } = request.body ?? {}

      if (!VALID_TIERS.includes(tier)) {
        return reply.status(400).send({ error: 'Invalid tier value' })
      }

      const user = await prisma.user.findUnique({
        where: { id: request.userId },
        select: { tier: true, trialEndsAt: true },
      })
      if (!user) return reply.status(404).send({ error: 'User not found' })

      if (user.tier !== tier) {
        const updateData: Record<string, unknown> = { tier }
        // If syncing from RevenueCat as paid, clear trial fields
        if (tier !== 'FREE' && request.body.isTrialPeriod === false) {
          updateData.trialEndsAt = null
        }
        await prisma.user.update({
          where: { id: request.userId },
          data: updateData,
        })
      }

      return reply.send({ ok: true, tier })
    }
  )

  // POST /subscription/webhook — RevenueCat webhook
  app.post<{ Body: { event: { type: string; app_user_id: string; id: string; product_id: string; period_type: string } } }>(
    '/webhook',
    async (request, reply) => {
      const secret = process.env.REVENUECAT_WEBHOOK_SECRET
      const authHeader = request.headers.authorization

      if (!secret || authHeader !== secret) {
        return reply.status(401).send({ error: 'Unauthorized' })
      }

      const { event } = request.body ?? {}
      if (!event?.id || !event?.app_user_id || !event?.type) {
        return reply.status(400).send({ error: 'Invalid webhook payload' })
      }

      // Idempotency — skip if already processed
      const existing = await prisma.webhookEvent.findUnique({
        where: { externalEventId: event.id },
      })
      if (existing) {
        return reply.send({ ok: true, skipped: true })
      }

      // Record event first
      await prisma.webhookEvent.create({
        data: {
          source: 'revenuecat',
          externalEventId: event.id,
        },
      })

      const UPGRADE_EVENTS = ['INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE']
      const DOWNGRADE_EVENTS = ['EXPIRATION', 'CANCELLATION', 'BILLING_ISSUE']

      if (UPGRADE_EVENTS.includes(event.type)) {
        const tier = tierFromProductId(event.product_id, event.period_type)
        const updateData: Record<string, unknown> = {
          tier,
          revenueCatUserId: event.app_user_id,
        }
        // If paid (not trial), clear trial fields
        if (event.period_type !== 'TRIAL') {
          updateData.trialEndsAt = null
        }
        await prisma.user.update({
          where: { id: event.app_user_id },
          data: updateData,
        })
      } else if (DOWNGRADE_EVENTS.includes(event.type)) {
        await prisma.user.update({
          where: { id: event.app_user_id },
          data: { tier: 'FREE' },
        })
      }

      return reply.send({ ok: true })
    }
  )
}

// Tier limits (mirrors CLAUDE.md)
const TIER_LIMITS = {
  FREE: {
    mealPlansPerWeek: 2,
    maxFavourites: 10,
    maxCollections: 1,
    aiPersonalisation: false,
    priceTrends: false,
    priceAlerts: false,
    purchaseReminders: false,
  },
  PLUS: {
    mealPlansPerWeek: 7,
    maxFavourites: null,
    maxCollections: null,
    aiPersonalisation: true,
    priceTrends: false,
    priceAlerts: true,
    purchaseReminders: false,
  },
  PRO: {
    mealPlansPerWeek: null,
    maxFavourites: null,
    maxCollections: null,
    aiPersonalisation: true,
    priceTrends: true,
    priceAlerts: true,
    purchaseReminders: true,
  },
} as const
