import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { verifyJWT } from '../middleware/auth'
import { prisma } from '../lib/prisma'
import { markActionComplete } from '../services/onboardingService'

export async function purchasesRoute(app: FastifyInstance) {
  // ── POST /purchases ───────────────────────────────────────────────────────
  app.post(
    '/',
    {
      preHandler: verifyJWT,
      schema: {
        body: {
          type: 'object',
          required: ['itemName', 'quantity', 'unit', 'pricePerUnit', 'totalPrice', 'storeName'],
          properties: {
            itemName:     { type: 'string', minLength: 1 },
            itemCategory: { type: 'string', enum: ['GROCERY', 'FUEL', 'HOME_IMPROVEMENT', 'HOUSEHOLD', 'PERSONAL_CARE', 'PET_SUPPLIES', 'OTHER'] },
            upc:          { type: 'string' },
            quantity:     { type: 'number', exclusiveMinimum: 0 },
            unit:         { type: 'string', minLength: 1 },
            pricePerUnit: { type: 'number', minimum: 0 },
            totalPrice:   { type: 'number', minimum: 0 },
            storeName:    { type: 'string', minLength: 1 },
            storeId:      { type: 'string' },
            planId:       { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.userId!
      const {
        itemName,
        itemCategory,
        upc,
        quantity,
        unit,
        pricePerUnit,
        totalPrice,
        storeName,
        storeId,
        planId,
      } = request.body as {
        itemName: string
        itemCategory?: string
        upc?: string
        quantity: number
        unit: string
        pricePerUnit: number
        totalPrice: number
        storeName: string
        storeId?: string
        planId?: string
      }

      const purchase = await prisma.purchaseHistory.create({
        data: {
          userId,
          itemName,
          itemCategory: (itemCategory as any) ?? 'GROCERY',
          upc: upc ?? null,
          quantity,
          unit,
          pricePerUnit,
          totalPrice,
          storeName,
          storeId: storeId ?? null,
          planId: planId ?? null,
        },
      })

      await markActionComplete(userId, 'first_purchase')

      return reply.status(201).send({ purchase })
    }
  )

  // ── GET /purchases ────────────────────────────────────────────────────────
  app.get(
    '/',
    {
      preHandler: verifyJWT,
      schema: {
        querystring: {
          type: 'object',
          properties: {
            ingredientName: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.userId!
      const { ingredientName } = request.query as { ingredientName?: string }

      const where: Record<string, unknown> = { userId }
      if (ingredientName) {
        where.itemName = ingredientName
      }

      const purchases = await prisma.purchaseHistory.findMany({
        where,
        orderBy: { purchasedAt: 'desc' },
      })

      return reply.send({ purchases })
    }
  )
}
