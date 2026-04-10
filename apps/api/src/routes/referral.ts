import type { FastifyInstance } from 'fastify'
import { verifyJWT } from '../middleware/auth'
import { prisma } from '../lib/prisma'

export async function referralRoute(app: FastifyInstance) {
  const db = prisma as any

  app.get('/code', { preHandler: verifyJWT, config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (request, reply) => {
    const record = await db.referralCode.findUnique({
      where: { userId: request.userId },
    })

    if (!record) return reply.status(404).send({ error: 'Referral code not found' })

    return reply.send({ code: record.code })
  })

  app.get('/stats', { preHandler: verifyJWT, config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (request, reply) => {
    const userId = request.userId

    const [invited, converted, rewardTotals] = await Promise.all([
      db.referralEvent.count({ where: { referrerId: userId } }),
      db.referralEvent.count({ where: { referrerId: userId, status: 'CONVERTED' } }),
      db.referralReward.aggregate({
        where: { userId },
        _sum: { bitesAwarded: true },
      }),
    ])

    return reply.send({
      invited,
      converted,
      totalBitesEarned: rewardTotals._sum.bitesAwarded ?? 0,
    })
  })

  // POST /referral/attribute — called at signup with ?ref= query param
  app.post<{ Body: { code: string } }>(
    '/attribute',
    { config: { rateLimit: { max: 3, timeWindow: '1 hour' } } },
    async (request, reply) => {
      const { code } = request.body ?? {}

      if (!code || typeof code !== 'string') {
        return reply.status(400).send({ error: 'Referral code is required' })
      }

      const referralCode = await db.referralCode.findUnique({ where: { code } })
      if (!referralCode) {
        return reply.status(404).send({ error: 'Invalid referral code' })
      }

      // This endpoint is called during signup; the new user ID is not yet available
      // Instead, return the referrer ID so the client can link it in subsequent calls
      // OR: the mobile app should call this AFTER account creation with their new user ID
      return reply.send({ referrerId: referralCode.userId })
    }
  )
}
