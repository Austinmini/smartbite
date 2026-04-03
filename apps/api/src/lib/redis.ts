import Redis from 'ioredis'

export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  lazyConnect: true,
  enableOfflineQueue: false,   // commands fail immediately when disconnected
  connectTimeout: 500,         // give up connecting after 500ms (not ioredis default 10s)
  maxRetriesPerRequest: 0,     // no per-command retries
})

redis.on('error', () => {
  // Suppress — connection errors are handled at call site with try/catch
})
