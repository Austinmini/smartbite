import type { FastifyInstance } from 'fastify'

export async function healthRoute(app: FastifyInstance) {
  app.get('/health', { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }, async () => {
    return { status: 'ok', timestamp: new Date().toISOString() }
  })
}
