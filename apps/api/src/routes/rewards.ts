import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { verifyJWT } from '../middleware/auth'
import { prisma } from '../lib/prisma'

const ALL_BADGES = [
  'FIRST_SCAN',
  'STREAK_7_DAY',
  'STREAK_30_DAY',
  'PIONEER',
  'VERIFIED',
  'CENTURY',
  'PRICE_CHAMPION',
  'COMMUNITY_HERO',
] as const

export async function rewardsRoute(app: FastifyInstance) {
  // ── GET /rewards/balance ────────────────────────────────────────────────────
  app.get(
    '/balance',
    { preHandler: verifyJWT },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.userId!

      const record = await prisma.bitesBalance.findUnique({ where: { userId } })

      return reply.send({
        balance:       record?.balance       ?? 0,
        lifetimeEarned: record?.lifetimeEarned ?? 0,
      })
    }
  )

  // ── GET /rewards/ledger ─────────────────────────────────────────────────────
  app.get(
    '/ledger',
    {
      preHandler: verifyJWT,
      schema: {
        querystring: {
          type: 'object',
          properties: {
            limit:  { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            offset: { type: 'integer', minimum: 0, default: 0 },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.userId!
      const { limit = 20, offset = 0 } = request.query as { limit?: number; offset?: number }

      const [entries, total] = await Promise.all([
        prisma.bitesLedger.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.bitesLedger.count({ where: { userId } }),
      ])

      return reply.send({ entries, total })
    }
  )

  // ── GET /rewards/badges ─────────────────────────────────────────────────────
  app.get(
    '/badges',
    { preHandler: verifyJWT },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.userId!

      const earned = await prisma.userBadge.findMany({ where: { userId } })
      const earnedMap = new Map(earned.map((b) => [b.badge, b.earnedAt]))

      const badges = ALL_BADGES.map((badge) => {
        const earnedAt = earnedMap.get(badge) ?? null
        return {
          badge,
          earned: earnedAt !== null,
          earnedAt,
        }
      })

      return reply.send({ badges })
    }
  )

  // ── GET /rewards/leaderboard ────────────────────────────────────────────────
  app.get(
    '/leaderboard',
    {
      preHandler: verifyJWT,
      schema: {
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.userId!
      const { limit = 20 } = request.query as { limit?: number }

      const rows = await prisma.bitesBalance.findMany({
        orderBy: { balance: 'desc' },
        take: limit,
        include: { user: { select: { email: true } } },
      })

      const leaderboard = rows.map((row, index) => ({
        rank:          index + 1,
        userId:        row.userId,
        balance:       row.balance,
        lifetimeEarned: row.lifetimeEarned,
        isCurrentUser: row.userId === userId,
      }))

      return reply.send({ leaderboard })
    }
  )
}
