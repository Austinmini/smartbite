import type { FastifyInstance } from 'fastify'
import { verifyJWT } from '../middleware/auth'
import { prisma } from '../lib/prisma'
import { awardBites } from '../services/rewardsService'

export async function promoRoute(app: FastifyInstance) {
  // POST /promo/redeem — validate and apply a promo code
  app.post<{ Body: { code: string } }>(
    '/redeem',
    {
      preHandler: verifyJWT,
      config: { rateLimit: { max: 5, timeWindow: '1 hour' } },
    },
    async (request, reply) => {
      const userId = (request as any).userId as string
      const { code } = request.body ?? {}

      if (!code || typeof code !== 'string') {
        return reply.status(400).send({ error: 'Promo code is required' })
      }

      const promoCode = await prisma.promoCode.findUnique({ where: { code } })
      if (!promoCode) {
        return reply.status(404).send({ error: 'Invalid promo code' })
      }

      // Check if code is active
      if (!promoCode.active) {
        return reply.status(400).send({ error: 'This promo code is no longer active' })
      }

      // Check if code has expired
      if (promoCode.validUntil && new Date() > promoCode.validUntil) {
        return reply.status(400).send({ error: 'This promo code has expired' })
      }

      // Check redemption limit
      if (promoCode.maxRedemptions && promoCode.redemptionCount >= promoCode.maxRedemptions) {
        return reply.status(400).send({ error: 'This promo code has reached its redemption limit' })
      }

      // Check if user has already redeemed this code
      const existingRedemption = await prisma.promoRedemption.findUnique({
        where: { promoCodeId_userId: { promoCodeId: promoCode.id, userId } },
      })
      if (existingRedemption) {
        return reply.status(409).send({ error: 'You have already redeemed this promo code' })
      }

      // Apply the promo code based on type
      const result: any = { ok: true, type: promoCode.type }

      if (promoCode.type === 'BITES_BONUS') {
        const value = (promoCode.value as any).bites ?? 0
        await awardBites(userId, value, 'ADMIN_ADJUSTMENT')
        result.bitesAwarded = value
      } else if (promoCode.type === 'PLUS_TRIAL') {
        // Grant Plus subscription
        const days = (promoCode.value as any).days ?? 30
        const trialEndsAt = new Date()
        trialEndsAt.setDate(trialEndsAt.getDate() + days)
        await prisma.user.update({
          where: { id: userId },
          data: { tier: 'PLUS', trialEndsAt },
        })
        result.daysGranted = days
      }

      // Record redemption and increment count
      await prisma.promoRedemption.create({
        data: { promoCodeId: promoCode.id, userId },
      })
      await prisma.promoCode.update({
        where: { id: promoCode.id },
        data: { redemptionCount: { increment: 1 } },
      })

      return reply.status(200).send(result)
    }
  )
}
