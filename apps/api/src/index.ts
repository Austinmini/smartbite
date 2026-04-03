import Fastify from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import { healthRoute } from './routes/health'

const app = Fastify({
  logger: {
    transport:
      process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
})

async function bootstrap() {
  await app.register(cors, { origin: true })

  await app.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: '1 minute',
  })

  await app.register(healthRoute)

  const port = Number(process.env.PORT) || 3000
  const host = process.env.HOST || '0.0.0.0'

  await app.listen({ port, host })
}

bootstrap().catch((err) => {
  app.log.error(err)
  process.exit(1)
})
