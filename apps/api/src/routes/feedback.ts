import type { FastifyInstance } from 'fastify'
import { verifyJWT } from '../middleware/auth'
import { prisma } from '../lib/prisma'

const feedbackSubmissionLog = new Map<string, number[]>()
const ONE_HOUR_MS = 60 * 60 * 1000
const MAX_SUBMISSIONS_PER_HOUR = 5

export async function feedbackRoute(app: FastifyInstance) {
  const db = prisma as any

  app.post(
    '/',
    {
      preHandler: verifyJWT,
      schema: {
        body: {
          type: 'object',
          required: ['type', 'body'],
          properties: {
            type: {
              type: 'string',
              enum: ['BUG', 'FEATURE_REQUEST', 'PRICE_ISSUE', 'GENERAL'],
            },
            subject: { type: 'string', maxLength: 200 },
            body: { type: 'string', minLength: 1, maxLength: 5000 },
            appVersion: { type: 'string', maxLength: 50 },
            platform: { type: 'string', maxLength: 50 },
          },
        },
      },
    },
    async (request, reply) => {
      const now = Date.now()
      const userId = request.userId
      const recentSubmissions = (feedbackSubmissionLog.get(userId) ?? []).filter(
        (timestamp) => now - timestamp < ONE_HOUR_MS
      )

      if (recentSubmissions.length >= MAX_SUBMISSIONS_PER_HOUR) {
        feedbackSubmissionLog.set(userId, recentSubmissions)
        return reply.status(429).send({ error: 'Feedback rate limit exceeded' })
      }

      feedbackSubmissionLog.set(userId, [...recentSubmissions, now])

      const { type, subject, body, appVersion, platform } = request.body as {
        type: 'BUG' | 'FEATURE_REQUEST' | 'PRICE_ISSUE' | 'GENERAL'
        subject?: string
        body: string
        appVersion?: string
        platform?: string
      }

      const feedback = await db.feedback.create({
        data: {
          userId,
          type,
          subject,
          body,
          appVersion,
          platform,
        },
      })

      return reply.status(201).send({ feedback })
    }
  )
}

export function resetFeedbackRateLimitState() {
  feedbackSubmissionLog.clear()
}
