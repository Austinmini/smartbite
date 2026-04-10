import type { FastifyRequest, FastifyReply } from 'fastify'
import jwt from 'jsonwebtoken'
import { supabaseServiceClient } from '../lib/supabase'
import { setSentryUser } from '../lib/sentry'

declare module 'fastify' {
  interface FastifyRequest {
    userId: string
  }
}

export async function verifyJWT(request: FastifyRequest, reply: FastifyReply) {
  const token = request.headers.authorization?.replace('Bearer ', '')
  if (!token) return reply.status(401).send({ error: 'Missing token' })

  if (process.env.NODE_ENV === 'test') {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET_TEST!) as { sub: string }
      request.userId = payload.sub
      setSentryUser(request.userId)
      return
    } catch {
      return reply.status(401).send({ error: 'Invalid token' })
    }
  }

  // Production: delegate to Supabase — never verify signature manually
  const { data, error } = await supabaseServiceClient.auth.getUser(token)
  if (error || !data.user) return reply.status(401).send({ error: 'Invalid token' })
  request.userId = data.user.id
  setSentryUser(request.userId)
}
