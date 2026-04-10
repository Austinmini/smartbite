import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { verifyJWT } from '../middleware/auth'
import { prisma } from '../lib/prisma'
import { markActionComplete } from '../services/onboardingService'

export async function recipesRoute(app: FastifyInstance) {
  // ── POST /recipes/:id/cooked ──────────────────────────────────────────────
  app.post(
    '/:id/cooked',
    {
      preHandler: verifyJWT,
      config: { rateLimit: { max: 50, timeWindow: '1 hour' } },
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        body: {
          type: 'object',
          required: ['servings'],
          properties: {
            servings:   { type: 'number', exclusiveMinimum: 0 },
            planMealId: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.userId!
      const { id: recipeId } = request.params as { id: string }
      const { servings, planMealId } = request.body as { servings: number; planMealId?: string }

      // 1. Fetch recipe
      const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } })
      if (!recipe) return reply.status(404).send({ error: 'Recipe not found' })

      const ingredients = recipe.ingredients as { name: string; amount: number; unit: string }[]
      const scale = servings / recipe.servings

      // 2. Deduct each ingredient from pantry
      const deductions: { ingredientName: string; deducted: number; unit: string; remaining: number }[] = []
      const missingFromPantry: string[] = []

      for (const ing of ingredients) {
        const needed = ing.amount * scale

        const pantryItem = await prisma.pantryItem.findUnique({
          where: { userId_itemName: { userId, itemName: ing.name } },
        })

        if (!pantryItem) {
          missingFromPantry.push(ing.name)
          continue
        }

        const deducted = Math.min(needed, pantryItem.quantity)
        const remaining = Math.max(0, pantryItem.quantity - needed)

        await prisma.pantryItem.update({
          where: { userId_itemName: { userId, itemName: ing.name } },
          data: { quantity: remaining },
        })

        await prisma.pantryLedger.create({
          data: {
            userId,
            pantryItemId: pantryItem.id,
            delta: -deducted,
            unit: ing.unit,
            action: 'RECIPE_COOKED',
            referenceId: planMealId ?? null,
          },
        })

        deductions.push({
          ingredientName: ing.name,
          deducted: round(deducted),
          unit: ing.unit,
          remaining: round(remaining),
        })
      }

      // 3. Increment timesCooked on Favourite if recipe is saved
      let timesCooked = 0
      const favourite = await prisma.favourite.findUnique({
        where: { userId_recipeId: { userId, recipeId } },
      })
      if (favourite) {
        const updated = await prisma.favourite.update({
          where: { userId_recipeId: { userId, recipeId } },
          data: { timesCooked: { increment: 1 } },
        })
        timesCooked = updated.timesCooked
      }

      await markActionComplete(userId, 'first_recipe_cooked')

      return reply.send({ deductions, missingFromPantry, timesCooked })
    }
  )
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000
}
