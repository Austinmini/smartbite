import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { supabaseServiceClient } from '../lib/supabase'
import { verifyJWT } from '../middleware/auth'

interface SignupBody { email: string; password: string }
interface LoginBody  { email: string; password: string }

export async function authRoute(app: FastifyInstance) {
  // POST /auth/signup
  app.post<{ Body: SignupBody }>(
    '/signup',
    { config: { rateLimit: { max: 5, timeWindow: '1 hour' } } },
    async (request, reply) => {
      const { email, password } = request.body ?? {}

      if (!email) return reply.status(400).send({ error: 'Email is required' })
      if (!password || password.length < 8)
        return reply.status(400).send({ error: 'Password must be at least 8 characters' })

      const { data, error } = await supabaseServiceClient.auth.signUp({ email, password })

      if (error || !data.user || !data.session) {
        const isConflict =
          error?.message?.toLowerCase().includes('already') ||
          error?.message?.toLowerCase().includes('registered')
        return reply
          .status(isConflict ? 409 : 400)
          .send({ error: error?.message ?? 'Signup failed' })
      }

      // Mirror user in our DB and auto-create referral code
      const user = await prisma.user.create({
        data: { id: data.user.id, email: data.user.email! },
      })

      // Generate referral code for the new user
      const code = await generateUniqueReferralCode()
      await prisma.referralCode.create({ data: { userId: user.id, code } })

      return reply.status(201).send({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        user: { id: user.id, email: user.email, tier: user.tier },
      })
    }
  )

  // POST /auth/login
  app.post<{ Body: LoginBody }>(
    '/login',
    { config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } },
    async (request, reply) => {
      const { email, password } = request.body ?? {}

      if (!email || !password) return reply.status(400).send({ error: 'Email and password required' })

      const { data, error } = await supabaseServiceClient.auth.signInWithPassword({ email, password })

      if (error || !data.user || !data.session)
        return reply.status(401).send({ error: 'Invalid email or password' })

      const user = await prisma.user.findUnique({ where: { id: data.user.id } })

      return reply.status(200).send({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        user: { id: data.user.id, email: data.user.email, tier: user?.tier ?? 'FREE' },
      })
    }
  )

  // POST /auth/logout
  app.post('/logout', { preHandler: verifyJWT }, async (_request, reply) => {
    await supabaseServiceClient.auth.signOut()
    return reply.status(200).send({ message: 'Logged out' })
  })

  // GET /auth/me
  app.get('/me', { preHandler: verifyJWT }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.userId },
      include: { profile: true },
    })
    if (!user) return reply.status(404).send({ error: 'User not found' })
    return reply.send({ user })
  })
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
async function generateUniqueReferralCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = Array.from({ length: 6 }, () =>
      ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
    ).join('')
    const existing = await prisma.referralCode.findUnique({ where: { code } })
    if (!existing) return code
  }
  throw new Error('Failed to generate unique referral code')
}
