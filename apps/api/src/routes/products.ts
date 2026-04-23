import type { FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import { verifyJWT } from '../middleware/auth'
import { prisma } from '../lib/prisma'
import { lookupByUpc as offLookup } from '../lib/openFoodFacts'
import { lookupByUpc as usdaLookup } from '../lib/usda'

export async function productsRoute(app: FastifyInstance) {
  app.get<{ Params: { upc: string } }>(
    '/lookup/:upc',
    {
      preHandler: verifyJWT,
      config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
    },
    async (request, reply) => {
      const { upc } = request.params

      // 1. Check DB cache
      const cached = await prisma.product.findUnique({ where: { upc } })
      if (cached) {
        return reply.status(200).send(cached)
      }

      // 2. Fan-out to OFF + USDA in parallel
      const [off, usda] = await Promise.all([offLookup(upc), usdaLookup(upc)])

      if (!off && !usda) {
        return reply.status(404).send({ error: 'Product not found' })
      }

      // 3. Merge: OFF wins on image + brand name; USDA wins on nutrition + unit size
      const name = off?.name ?? usda?.name ?? 'Unknown'
      const brand = off?.brand ?? usda?.brand ?? null
      const imageUrl = off?.imageUrl ?? null
      const unitSize = off?.unitSize ?? usda?.unitSize ?? null
      const nutrition = usda?.nutrition ?? Prisma.JsonNull
      const source = off && usda ? 'off_usda' : off ? 'open_food_facts' : 'usda'

      // 4. Cache and return
      const saved = await prisma.product.upsert({
        where: { upc },
        update: { name, brand, imageUrl, unitSize, nutrition },
        create: { upc, name, brand, imageUrl, unitSize, nutrition, source },
      })

      return reply.status(200).send(saved)
    }
  )
}
