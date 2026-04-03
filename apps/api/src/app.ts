import Fastify, { type FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import { healthRoute } from './routes/health'
import { authRoute } from './routes/auth'
import { profileRoute } from './routes/profile'
import { storesRoute } from './routes/stores'
import { plansRoute } from './routes/plans'

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

  return app
}
