import type { FastifyInstance } from 'fastify'
import { verifyJWT } from '../middleware/auth'
import { prisma } from '../lib/prisma'
import { redis } from '../lib/redis'
import {
  generateMealPlan,
  saveMealPlan,
  getCurrentPlan,
  getPlans,
  getMeal,
  regenerateMeal,
  generateDayMeals,
} from '../services/mealPlanService'
import { markActionComplete } from '../services/onboardingService'

const TIER_LIMITS = {
  FREE: { mealPlansPerWeek: 2 },
  PLUS: { mealPlansPerWeek: 7 },
  PRO: { mealPlansPerWeek: Infinity },
} as const

function getWeekKey(): string {
  const now = new Date()
  const year = now.getFullYear()
  const startOfYear = new Date(year, 0, 1)
  const week = Math.ceil(
    ((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
  )
  return `${year}-W${week}`
}

export async function plansRoute(app: FastifyInstance) {
  // ─── POST /plans/generate ──────────────────────────────────────────────────
  app.post('/generate', { preHandler: verifyJWT, config: { rateLimit: { max: 10, timeWindow: '1 hour' } } }, async (request, reply) => {
    const userId = (request as any).userId as string
    const { dayCount } = (request.body as any) || {}

    // Fetch user tier
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { tier: true } })
    if (!user) return reply.status(401).send({ error: 'User not found' })

    // Check tier gate via Redis counter (fail-open if Redis is unavailable)
    const weekKey = getWeekKey()
    const countKey = `plans:week:${userId}:${weekKey}`
    let currentCount = 0
    try {
      const rawCount = await redis.get(countKey)
      currentCount = rawCount ? parseInt(rawCount, 10) : 0
    } catch {
      // Redis unavailable — allow request, tier gate is best-effort
    }

    const limit = TIER_LIMITS[user.tier as keyof typeof TIER_LIMITS]?.mealPlansPerWeek ?? 2
    if (currentCount >= limit) {
      return reply.status(429).send({
        error: `Weekly plan limit reached (${limit} plans/week on your current plan)`,
      })
    }

    // Fetch profile
    const profile = await prisma.userProfile.findUnique({ where: { userId } })
    if (!profile) {
      return reply.status(400).send({ error: 'Complete your profile before generating a plan' })
    }

    // Generate via Claude
    const planData = await generateMealPlan({
      profile: profile as any,
      weekBudget: profile.weeklyBudget,
      dayCount: dayCount && dayCount > 0 ? dayCount : 7,
    })

    // Save to DB
    const saved = await saveMealPlan(userId, planData, profile.servings)
    await markActionComplete(userId, 'first_plan_generated')

    // Increment Redis counter; set TTL on first use (best-effort — Redis may be unavailable)
    try {
      const newCount = await redis.incr(countKey)
      if (newCount === 1) {
        await redis.expire(countKey, 7 * 24 * 60 * 60)
      }
    } catch {
      // Redis unavailable — counter not incremented, acceptable for now
    }

    return reply.status(201).send({ plan: saved })
  })

  // ─── GET /plans/current ────────────────────────────────────────────────────
  app.get('/current', { preHandler: verifyJWT }, async (request, reply) => {
    const userId = (request as any).userId as string
    const plan = await getCurrentPlan(userId)
    if (!plan) return reply.status(204).send()
    return reply.status(200).send({ plan })
  })

  // ─── GET /plans ────────────────────────────────────────────────────────────
  app.get('/', { preHandler: verifyJWT }, async (request, reply) => {
    const userId = (request as any).userId as string
    const query = (request.query as any) || {}
    const page = parseInt(query.page || '1', 10)
    const result = await getPlans(userId, page)
    return reply.status(200).send(result)
  })

  // ─── GET /plans/:id/meals/:mealId ──────────────────────────────────────────
  app.get('/:id/meals/:mealId', { preHandler: verifyJWT }, async (request, reply) => {
    const { id: planId, mealId } = (request.params as any)
    const meal = await getMeal(planId, mealId)
    if (!meal) return reply.status(404).send({ error: 'Meal not found' })
    return reply.status(200).send({ meal })
  })

  // ─── POST /plans/:id/regenerate-meal ──────────────────────────────────────
  app.post('/:id/regenerate-meal', { preHandler: verifyJWT }, async (request, reply) => {
    const userId = (request as any).userId as string
    const { id: planId } = (request.params as any)
    const { mealId } = (request.body as any) || {}

    if (!mealId) {
      return reply.status(400).send({ error: 'mealId is required' })
    }

    const profile = await prisma.userProfile.findUnique({ where: { userId } })
    if (!profile) {
      return reply.status(400).send({ error: 'Profile not found' })
    }

    const result = await regenerateMeal(planId, mealId, profile as any)
    return reply.status(200).send(result)
  })

  // ─── POST /plans/:id/generate-day ───────────────────────────────────────────
  app.post('/:id/generate-day', { preHandler: verifyJWT }, async (request, reply) => {
    const userId = (request as any).userId as string
    const { id: planId } = (request.params as any)
    const { dayOfWeek } = (request.body as any) || {}

    // Validate dayOfWeek
    if (typeof dayOfWeek !== 'number' || dayOfWeek < 0 || dayOfWeek > 6) {
      return reply.status(400).send({ error: 'dayOfWeek must be an integer between 0 and 6' })
    }

    // Verify plan belongs to user
    const plan = await prisma.mealPlan.findUnique({
      where: { id: planId },
      select: { userId: true, meals: { where: { dayOfWeek } } },
    })
    if (!plan) {
      return reply.status(404).send({ error: 'Plan not found' })
    }
    if (plan.userId !== userId) {
      return reply.status(403).send({ error: 'Unauthorized' })
    }

    // Check if day already generated
    if (plan.meals.length > 0) {
      return reply.status(409).send({ error: `Meals already exist for day ${dayOfWeek}` })
    }

    // Fetch user profile
    const profile = await prisma.userProfile.findUnique({ where: { userId } })
    if (!profile) {
      return reply.status(400).send({ error: 'Profile not found' })
    }

    try {
      const updatedPlan = await generateDayMeals(planId, dayOfWeek, profile as any)
      return reply.status(200).send({ plan: updatedPlan })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      return reply.status(500).send({ error: msg })
    }
  })
}
