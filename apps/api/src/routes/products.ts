import type { FastifyInstance } from 'fastify'
import { verifyJWT } from '../middleware/auth'
import { prisma } from '../lib/prisma'
import { lookupByUpc } from '../lib/openFoodFacts'

export async function productsRoute(app: FastifyInstance) {
  app.get<{ Params: { upc: string } }>(
    '/lookup/:upc',
    {
      preHandler: verifyJWT,
      config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
    },
    async (request, reply) => {
      const { upc } = request.params

      // 1. Check cache
      const cached = await prisma.product.findUnique({ where: { upc } })
      if (cached) {
        return reply.status(200).send(cached)
      }

      // 2. Query Open Food Facts
      const product = await lookupByUpc(upc)
      if (!product) {
        return reply.status(404).send({ error: 'Product not found' })
      }

      // 3. Cache and return
      const saved = await prisma.product.upsert({
        where: { upc },
        update: {
          name: product.name,
          brand: product.brand,
          imageUrl: product.imageUrl,
          unitSize: product.unitSize,
        },
        create: {
          upc,
          name: product.name,
          brand: product.brand,
          imageUrl: product.imageUrl,
          unitSize: product.unitSize,
          source: 'open_food_facts',
        },
      })

      return reply.status(200).send(saved)
    }
  )
}
