import type { FastifyInstance } from 'fastify'
import { verifyJWT } from '../middleware/auth'
import { prisma } from '../lib/prisma'

const FREE_FAVOURITES_LIMIT = 10
const FREE_COLLECTIONS_LIMIT = 1

export async function favouritesRoute(app: FastifyInstance) {
  app.post(
    '/',
    {
      preHandler: verifyJWT,
      schema: {
        body: {
          type: 'object',
          required: ['recipeId'],
          properties: {
            recipeId: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = request.userId
      const { recipeId } = request.body as { recipeId: string }

      const existing = await prisma.favourite.findUnique({
        where: { userId_recipeId: { userId, recipeId } },
      })
      if (existing) return reply.status(409).send({ error: 'Recipe already saved' })

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { tier: true },
      })
      if (!user) return reply.status(404).send({ error: 'User not found' })

      if (user.tier === 'FREE') {
        const count = await prisma.favourite.count({ where: { userId } })
        if (count >= FREE_FAVOURITES_LIMIT) {
          return reply.status(403).send({ error: 'Free tier favourites limit reached' })
        }
      }

      const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } })
      if (!recipe) return reply.status(404).send({ error: 'Recipe not found' })

      const favourite = await prisma.favourite.create({
        data: { userId, recipeId },
      })

      return reply.status(201).send({ favourite })
    }
  )

  app.get(
    '/',
    {
      preHandler: verifyJWT,
      schema: {
        querystring: {
          type: 'object',
          properties: {
            sort: { type: 'string', enum: ['recent', 'mostCooked'], default: 'recent' },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            offset: { type: 'integer', minimum: 0, default: 0 },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = request.userId
      const { sort = 'recent', limit = 20, offset = 0 } = request.query as {
        sort?: 'recent' | 'mostCooked'
        limit?: number
        offset?: number
      }

      const orderBy =
        sort === 'mostCooked'
          ? [{ timesCooked: 'desc' as const }, { savedAt: 'desc' as const }]
          : [{ savedAt: 'desc' as const }]

      const [favourites, total] = await Promise.all([
        prisma.favourite.findMany({
          where: { userId },
          orderBy,
          take: limit,
          skip: offset,
        }),
        prisma.favourite.count({ where: { userId } }),
      ])

      return reply.send({ favourites, total })
    }
  )

  app.put(
    '/:recipeId',
    {
      preHandler: verifyJWT,
      schema: {
        params: {
          type: 'object',
          required: ['recipeId'],
          properties: { recipeId: { type: 'string' } },
        },
        body: {
          type: 'object',
          additionalProperties: false,
          properties: {
            userRating: { type: 'integer', minimum: 1, maximum: 5 },
            notes: { type: 'string', maxLength: 2000 },
            timesCooked: { type: 'integer', minimum: 0 },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = request.userId
      const { recipeId } = request.params as { recipeId: string }
      const { userRating, notes, timesCooked } = request.body as {
        userRating?: number
        notes?: string
        timesCooked?: number
      }

      const existing = await prisma.favourite.findUnique({
        where: { userId_recipeId: { userId, recipeId } },
      })
      if (!existing) return reply.status(404).send({ error: 'Favourite not found' })

      const favourite = await prisma.favourite.update({
        where: { userId_recipeId: { userId, recipeId } },
        data: {
          ...(userRating !== undefined ? { userRating } : {}),
          ...(notes !== undefined ? { notes } : {}),
          ...(timesCooked !== undefined ? { timesCooked } : {}),
        },
      })

      return reply.send({ favourite })
    }
  )

  app.delete(
    '/:recipeId',
    {
      preHandler: verifyJWT,
      schema: {
        params: {
          type: 'object',
          required: ['recipeId'],
          properties: { recipeId: { type: 'string' } },
        },
      },
    },
    async (request, reply) => {
      const userId = request.userId
      const { recipeId } = request.params as { recipeId: string }

      await prisma.favourite.delete({
        where: { userId_recipeId: { userId, recipeId } },
      })

      return reply.status(204).send()
    }
  )
}

export async function collectionsRoute(app: FastifyInstance) {
  app.get('/', { preHandler: verifyJWT }, async (request, reply) => {
    const collections = await prisma.collection.findMany({
      where: { userId: request.userId },
      orderBy: [{ createdAt: 'desc' }],
    })

    return reply.send({ collections })
  })

  app.post(
    '/',
    {
      preHandler: verifyJWT,
      schema: {
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 80 },
            emoji: { type: 'string', minLength: 1, maxLength: 8 },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = request.userId
      const { name, emoji } = request.body as { name: string; emoji?: string }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { tier: true },
      })
      if (!user) return reply.status(404).send({ error: 'User not found' })

      if (user.tier === 'FREE') {
        const count = await prisma.collection.count({ where: { userId } })
        if (count >= FREE_COLLECTIONS_LIMIT) {
          return reply.status(403).send({ error: 'Free tier collections limit reached' })
        }
      }

      const collection = await prisma.collection.create({
        data: { userId, name, emoji, recipeIds: [] },
      })

      return reply.status(201).send({ collection })
    }
  )

  app.put(
    '/:id',
    {
      preHandler: verifyJWT,
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 80 },
            emoji: { type: 'string', minLength: 1, maxLength: 8 },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = request.userId
      const { id } = request.params as { id: string }
      const { name, emoji } = request.body as { name?: string; emoji?: string }

      const existing = await prisma.collection.findUnique({ where: { id } })
      if (!existing || existing.userId !== userId) {
        return reply.status(404).send({ error: 'Collection not found' })
      }

      const collection = await prisma.collection.update({
        where: { id },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(emoji !== undefined ? { emoji } : {}),
        },
      })

      return reply.send({ collection })
    }
  )

  app.delete(
    '/:id',
    {
      preHandler: verifyJWT,
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
      },
    },
    async (request, reply) => {
      await prisma.collection.delete({
        where: { id: (request.params as { id: string }).id },
      })

      return reply.status(204).send()
    }
  )

  app.post(
    '/:id/recipes',
    {
      preHandler: verifyJWT,
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        body: {
          type: 'object',
          required: ['recipeId'],
          properties: { recipeId: { type: 'string', minLength: 1 } },
        },
      },
    },
    async (request, reply) => {
      const userId = request.userId
      const { id } = request.params as { id: string }
      const { recipeId } = request.body as { recipeId: string }

      const collection = await prisma.collection.findUnique({ where: { id } })
      if (!collection || collection.userId !== userId) {
        return reply.status(404).send({ error: 'Collection not found' })
      }

      const favourite = await prisma.favourite.findUnique({
        where: { userId_recipeId: { userId, recipeId } },
      })
      if (!favourite) return reply.status(404).send({ error: 'Favourite not found' })

      const nextRecipeIds = uniquePush(collection.recipeIds, recipeId)
      const nextCollectionIds = uniquePush(favourite.collectionIds, id)

      const [updatedCollection] = await Promise.all([
        prisma.collection.update({
          where: { id },
          data: { recipeIds: { set: nextRecipeIds } },
        }),
        prisma.favourite.update({
          where: { userId_recipeId: { userId, recipeId } },
          data: { collectionIds: { set: nextCollectionIds } },
        }),
      ])

      return reply.send({ collection: updatedCollection })
    }
  )

  app.delete(
    '/:id/recipes/:recipeId',
    {
      preHandler: verifyJWT,
      schema: {
        params: {
          type: 'object',
          required: ['id', 'recipeId'],
          properties: {
            id: { type: 'string' },
            recipeId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = request.userId
      const { id, recipeId } = request.params as { id: string; recipeId: string }

      const collection = await prisma.collection.findUnique({ where: { id } })
      if (!collection || collection.userId !== userId) {
        return reply.status(404).send({ error: 'Collection not found' })
      }

      const favourite = await prisma.favourite.findUnique({
        where: { userId_recipeId: { userId, recipeId } },
      })
      if (!favourite) return reply.status(404).send({ error: 'Favourite not found' })

      const [updatedCollection] = await Promise.all([
        prisma.collection.update({
          where: { id },
          data: { recipeIds: { set: collection.recipeIds.filter((entry) => entry !== recipeId) } },
        }),
        prisma.favourite.update({
          where: { userId_recipeId: { userId, recipeId } },
          data: { collectionIds: { set: favourite.collectionIds.filter((entry) => entry !== id) } },
        }),
      ])

      return reply.send({ collection: updatedCollection })
    }
  )
}

function uniquePush(values: string[], value: string): string[] {
  return values.includes(value) ? values : [...values, value]
}
