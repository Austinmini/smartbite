import type { FastifyInstance } from 'fastify'
import { verifyJWT } from '../middleware/auth'
import { prisma } from '../lib/prisma'

export async function referralRoute(app: FastifyInstance) {
  const db = prisma as any

  app.get('/code', { preHandler: verifyJWT }, async (request, reply) => {
    const record = await db.referralCode.findUnique({
      where: { userId: request.userId },
    })

    if (!record) return reply.status(404).send({ error: 'Referral code not found' })

    return reply.send({ code: record.code })
  })

  app.get('/stats', { preHandler: verifyJWT }, async (request, reply) => {
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
}
