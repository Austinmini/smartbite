import Fastify, { type FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import { healthRoute } from './routes/health'
import { authRoute } from './routes/auth'
import { profileRoute } from './routes/profile'
import { storesRoute } from './routes/stores'
import { plansRoute } from './routes/plans'
import { pricesRoute } from './routes/prices'
import { productsRoute } from './routes/products'
import { purchasesRoute } from './routes/purchases'
import { pantryRoute } from './routes/pantry'
import { recipesRoute } from './routes/recipes'
import { rewardsRoute } from './routes/rewards'

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger:
      process.env.NODE_ENV === 'test'
        ? false
        : {
            transport:
              process.env.NODE_ENV !== 'production'
                ? { target: 'pino-pretty', options: { colorize: true } }
                : undefined,
          },
  })

  await app.register(cors, { origin: true })
  await app.register(rateLimit, { global: true, max: 100, timeWindow: '1 minute' })

  await app.register(healthRoute)
  await app.register(authRoute, { prefix: '/auth' })
  await app.register(profileRoute, { prefix: '/profile' })
  await app.register(storesRoute, { prefix: '/stores' })
  await app.register(plansRoute, { prefix: '/plans' })
  await app.register(pricesRoute, { prefix: '/prices' })
  await app.register(productsRoute, { prefix: '/products' })
  await app.register(purchasesRoute, { prefix: '/purchases' })
  await app.register(pantryRoute, { prefix: '/pantry' })
  await app.register(recipesRoute, { prefix: '/recipes' })
  await app.register(rewardsRoute, { prefix: '/rewards' })

  return app
}
