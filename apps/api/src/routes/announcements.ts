import type { FastifyInstance } from 'fastify'
import { verifyJWT } from '../middleware/auth'
import { prisma } from '../lib/prisma'

export async function announcementsRoute(app: FastifyInstance) {
  // ── GET /announcements ──────────────────────────────────────────────────────

  app.get(
    '/',
    {
      preHandler: verifyJWT,
      config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    },
    async (request, reply) => {
      const userId = (request as any).userId as string

      const user = await prisma.user.findUnique({ where: { id: userId }, select: { tier: true } })
      if (!user) return reply.status(401).send({ error: 'User not found' })

      const now = new Date()

      const announcements = await prisma.announcement.findMany({
        where: {
          active: true,
          startsAt: { lte: now },
          OR: [{ endsAt: null }, { endsAt: { gt: now } }],
          targetTiers: { has: user.tier },
        },
        orderBy: { startsAt: 'desc' },
      })

      return reply.status(200).send({ announcements })
    }
  )
}
