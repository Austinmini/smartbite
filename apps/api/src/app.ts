import Fastify, { type FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import * as Sentry from '@sentry/node'
import { initSentry, setSentryUser, clearSentryUser } from './lib/sentry'
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
import { remindersRoute } from './routes/reminders'
import { announcementsRoute } from './routes/announcements'
import { favouritesRoute } from './routes/favourites'
import { collectionsRoute } from './routes/collections'
import { feedbackRoute } from './routes/feedback'
import { referralRoute } from './routes/referral'
import { subscriptionRoute } from './routes/subscription'
import { promoRoute } from './routes/promo'

export async function buildApp(): Promise<FastifyInstance> {
  // Initialize Sentry if DSN is configured
  if (process.env.NODE_ENV !== 'test') {
    initSentry()
  }

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

  // Sentry error handling — capture exceptions and set user context
  app.addHook('onRequest', async (request) => {
    // Set user context if authenticated
    const userId = (request as any).userId
    if (userId) {
      setSentryUser(userId)
    }
  })

  app.addHook('onError', async (request, reply, error) => {
    // Capture errors in Sentry for 5xx responses
    if (reply.statusCode >= 500) {
      Sentry.captureException(error, {
        contexts: {
          http: {
            method: request.method,
            url: request.url,
            status_code: reply.statusCode,
          },
        },
      })
    }
  })

  // Clear user context on response (cleanup)
  app.addHook('onResponse', async () => {
    clearSentryUser()
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
  await app.register(remindersRoute, { prefix: '/reminders' })
  await app.register(announcementsRoute, { prefix: '/announcements' })
  await app.register(favouritesRoute, { prefix: '/favourites' })
  await app.register(collectionsRoute, { prefix: '/collections' })
  await app.register(feedbackRoute, { prefix: '/feedback' })
  await app.register(referralRoute, { prefix: '/referral' })
  await app.register(subscriptionRoute, { prefix: '/subscription' })
  await app.register(promoRoute, { prefix: '/promo' })

  return app
}
