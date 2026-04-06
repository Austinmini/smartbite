import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { verifyJWT } from '../middleware/auth'
import { prisma } from '../lib/prisma'

export async function pantryRoute(app: FastifyInstance) {
  // ── GET /pantry/check ─────────────────────────────────────────────────────
  // Must be registered before GET /pantry/:itemName to avoid route conflict
  app.get(
    '/check',
    {
      preHandler: verifyJWT,
      schema: {
        querystring: {
          type: 'object',
          required: ['ingredients'],
          properties: {
            ingredients: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.userId!
      const { ingredients } = request.query as { ingredients: string }

      const names = ingredients.split(',').map((s) => s.trim()).filter(Boolean)

      const pantryItems = await prisma.pantryItem.findMany({
        where: { userId, itemName: { in: names } },
        select: { itemName: true, quantity: true, unit: true },
      })

      const pantryMap = new Map(pantryItems.map((item) => [item.itemName, item]))

      const coverage: Record<string, { inPantry: boolean; quantity?: number; unit?: string }> = {}
      for (const name of names) {
        const found = pantryMap.get(name)
        coverage[name] = found
          ? { inPantry: true, quantity: found.quantity, unit: found.unit }
          : { inPantry: false }
      }

      return reply.send({ coverage })
    }
  )

  // ── POST /pantry/sync-purchase ────────────────────────────────────────────
  app.post(
    '/sync-purchase',
    {
      preHandler: verifyJWT,
      schema: {
        body: {
          type: 'object',
          required: ['itemName', 'quantity', 'unit', 'storeName'],
          properties: {
            itemName:   { type: 'string', minLength: 1 },
            quantity:   { type: 'number', exclusiveMinimum: 0 },
            unit:       { type: 'string', minLength: 1 },
            storeName:  { type: 'string', minLength: 1 },
            purchaseId: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.userId!
      const { itemName, quantity, unit, purchaseId } = request.body as {
        itemName: string
        quantity: number
        unit: string
        storeName: string
        purchaseId?: string
      }

      const item = await prisma.pantryItem.upsert({
        where: { userId_itemName: { userId, itemName } },
        update: {
          quantity: { increment: quantity },
          unit,
          lastRestockedAt: new Date(),
        },
        create: {
          userId,
          itemName,
          quantity,
          unit,
          lastRestockedAt: new Date(),
        },
      })

      await prisma.pantryLedger.create({
        data: {
          userId,
          pantryItemId: item.id,
          delta: quantity,
          unit,
          action: 'PURCHASE',
          referenceId: purchaseId ?? null,
        },
      })

      return reply.send({ item })
    }
  )

  // ── GET /pantry ───────────────────────────────────────────────────────────
  app.get(
    '/',
    { preHandler: verifyJWT },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.userId!

      const items = await prisma.pantryItem.findMany({
        where: { userId },
        orderBy: { itemName: 'asc' },
      })

      return reply.send({ items })
    }
  )

  // ── POST /pantry ──────────────────────────────────────────────────────────
  app.post(
    '/',
    {
      preHandler: verifyJWT,
      schema: {
        body: {
          type: 'object',
          required: ['itemName', 'quantity', 'unit'],
          properties: {
            itemName:     { type: 'string', minLength: 1 },
            itemCategory: { type: 'string' },
            quantity:     { type: 'number', exclusiveMinimum: 0 },
            unit:         { type: 'string', minLength: 1 },
            notes:        { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.userId!
      const { itemName, itemCategory, quantity, unit, notes } = request.body as {
        itemName: string
        itemCategory?: string
        quantity: number
        unit: string
        notes?: string
      }

      const item = await prisma.pantryItem.upsert({
        where: { userId_itemName: { userId, itemName } },
        update: { quantity, unit, notes: notes ?? null },
        create: {
          userId,
          itemName,
          itemCategory: (itemCategory as any) ?? 'GROCERY',
          quantity,
          unit,
          notes: notes ?? null,
        },
      })

      await prisma.pantryLedger.create({
        data: {
          userId,
          pantryItemId: item.id,
          delta: quantity,
          unit,
          action: 'MANUAL_ADD',
        },
      })

      return reply.status(201).send({ item })
    }
  )

  // ── PUT /pantry/:itemName ─────────────────────────────────────────────────
  app.put(
    '/:itemName',
    {
      preHandler: verifyJWT,
      schema: {
        params: {
          type: 'object',
          required: ['itemName'],
          properties: { itemName: { type: 'string' } },
        },
        body: {
          type: 'object',
          required: ['quantity', 'unit'],
          properties: {
            quantity: { type: 'number', minimum: 0 },
            unit:     { type: 'string', minLength: 1 },
            notes:    { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.userId!
      const { itemName } = request.params as { itemName: string }
      const { quantity, unit, notes } = request.body as { quantity: number; unit: string; notes?: string }

      const existing = await prisma.pantryItem.findUnique({
        where: { userId_itemName: { userId, itemName } },
      })
      if (!existing) return reply.status(404).send({ error: 'Pantry item not found' })

      const item = await prisma.pantryItem.update({
        where: { userId_itemName: { userId, itemName } },
        data: { quantity, unit, notes: notes ?? existing.notes },
      })

      const delta = quantity - existing.quantity
      await prisma.pantryLedger.create({
        data: {
          userId,
          pantryItemId: item.id,
          delta,
          unit,
          action: 'ADJUSTMENT',
        },
      })

      return reply.send({ item })
    }
  )

  // ── DELETE /pantry/:itemName ──────────────────────────────────────────────
  app.delete(
    '/:itemName',
    {
      preHandler: verifyJWT,
      schema: {
        params: {
          type: 'object',
          required: ['itemName'],
          properties: { itemName: { type: 'string' } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.userId!
      const { itemName } = request.params as { itemName: string }

      const existing = await prisma.pantryItem.findUnique({
        where: { userId_itemName: { userId, itemName } },
      })
      if (!existing) return reply.status(404).send({ error: 'Pantry item not found' })

      await prisma.pantryItem.delete({
        where: { userId_itemName: { userId, itemName } },
      })

      return reply.status(204).send()
    }
  )
}
