import type { FastifyInstance } from 'fastify'
import { verifyJWT } from '../middleware/auth'
import { prisma } from '../lib/prisma'
import { getReminderSuggestions } from '../services/reminderService'

function requirePro(tier: string, reply: any) {
  if (tier !== 'PRO') {
    reply.status(403).send({ error: 'Purchase reminders require a Pro subscription' })
    return false
  }
  return true
}

export async function remindersRoute(app: FastifyInstance) {
  // ── GET /reminders/suggestions — must be registered before /:id ─────────────

  app.get(
    '/suggestions',
    {
      preHandler: verifyJWT,
      config: { rateLimit: { max: 10, timeWindow: '1 hour' } },
    },
    async (request, reply) => {
      const userId = (request as any).userId as string

      const user = await prisma.user.findUnique({ where: { id: userId }, select: { tier: true } })
      if (!user) return reply.status(401).send({ error: 'User not found' })
      if (!requirePro(user.tier, reply)) return

      const suggestions = await getReminderSuggestions(userId)
      return reply.status(200).send({ suggestions })
    }
  )

  // ── GET /reminders ──────────────────────────────────────────────────────────

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
      if (!requirePro(user.tier, reply)) return

      const reminders = await prisma.purchaseReminder.findMany({
        where: { userId, active: true },
        orderBy: { nextRemindAt: 'asc' },
      })

      return reply.status(200).send({ reminders })
    }
  )

  // ── POST /reminders ─────────────────────────────────────────────────────────

  app.post<{
    Body: {
      itemName?: string
      quantity?: number
      unit?: string
      frequencyDays?: number
    }
  }>(
    '/',
    {
      preHandler: verifyJWT,
      config: { rateLimit: { max: 50, timeWindow: '1 hour' } },
    },
    async (request, reply) => {
      const userId = (request as any).userId as string
      const { itemName, quantity, unit, frequencyDays } = request.body ?? {}

      if (!itemName || typeof itemName !== 'string')
        return reply.status(400).send({ error: 'itemName is required' })
      if (typeof quantity !== 'number' || quantity <= 0)
        return reply.status(400).send({ error: 'quantity must be a positive number' })
      if (!unit) return reply.status(400).send({ error: 'unit is required' })
      if (typeof frequencyDays !== 'number' || frequencyDays <= 0)
        return reply.status(400).send({ error: 'frequencyDays must be a positive number' })

      const user = await prisma.user.findUnique({ where: { id: userId }, select: { tier: true } })
      if (!user) return reply.status(401).send({ error: 'User not found' })
      if (!requirePro(user.tier, reply)) return

      const nextRemindAt = new Date()

      const reminder = await prisma.purchaseReminder.upsert({
        where: { userId_itemName: { userId, itemName } },
        update: { quantity, unit, frequencyDays, nextRemindAt, active: true },
        create: { userId, itemName, quantity, unit, frequencyDays, nextRemindAt },
      })

      return reply.status(201).send(reminder)
    }
  )

  // ── PUT /reminders/:id ──────────────────────────────────────────────────────

  app.put<{
    Params: { id: string }
    Body: { quantity?: number; unit?: string; frequencyDays?: number }
  }>(
    '/:id',
    { preHandler: verifyJWT, config: { rateLimit: { max: 50, timeWindow: '1 hour' } } },
    async (request, reply) => {
      const userId = (request as any).userId as string

      const user = await prisma.user.findUnique({ where: { id: userId }, select: { tier: true } })
      if (!user) return reply.status(401).send({ error: 'User not found' })
      if (!requirePro(user.tier, reply)) return

      const existing = await prisma.purchaseReminder.findFirst({
        where: { id: request.params.id, userId },
      })
      if (!existing) return reply.status(404).send({ error: 'Reminder not found' })

      const { quantity, unit, frequencyDays } = request.body ?? {}
      const data: Record<string, unknown> = {}
      if (quantity !== undefined) data.quantity = quantity
      if (unit !== undefined) data.unit = unit
      if (frequencyDays !== undefined) {
        data.frequencyDays = frequencyDays
        // Advance next remind date when frequency changes
        data.nextRemindAt = new Date()
      }

      const updated = await prisma.purchaseReminder.update({
        where: { id: request.params.id },
        data,
      })

      return reply.status(200).send(updated)
    }
  )

  // ── DELETE /reminders/:id ───────────────────────────────────────────────────

  app.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: verifyJWT, config: { rateLimit: { max: 50, timeWindow: '1 hour' } } },
    async (request, reply) => {
      const userId = (request as any).userId as string

      const user = await prisma.user.findUnique({ where: { id: userId }, select: { tier: true } })
      if (!user) return reply.status(401).send({ error: 'User not found' })
      if (!requirePro(user.tier, reply)) return

      const existing = await prisma.purchaseReminder.findFirst({
        where: { id: request.params.id, userId },
      })
      if (!existing) return reply.status(404).send({ error: 'Reminder not found' })

      await prisma.purchaseReminder.delete({ where: { id: request.params.id } })
      return reply.status(200).send({ success: true })
    }
  )

}
