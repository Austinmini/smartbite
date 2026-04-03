import '../../test/mocks/prisma'
import '../../test/mocks/supabase'
import { buildApp } from '../../app'
import { prisma } from '../../lib/prisma'
import { supabaseServiceClient } from '../../lib/supabase'
import { createAuthToken } from '../../test/factories'

const prismaMock = prisma as any
const supabaseMock = supabaseServiceClient as any

let app: Awaited<ReturnType<typeof buildApp>>

beforeAll(async () => {
  app = await buildApp()
  await app.ready()
})
afterAll(async () => { await app.close() })
beforeEach(() => { jest.clearAllMocks() })

// ─── POST /auth/signup ────────────────────────────────────────────────────────

describe('POST /auth/signup', () => {
  it('creates a user and returns access_token', async () => {
    supabaseMock.auth.signUp.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@example.com' }, session: { access_token: 'tok' } },
      error: null,
    })
    prismaMock.user.create.mockResolvedValue({ id: 'user-1', email: 'test@example.com', tier: 'FREE' })
    prismaMock.referralCode.findUnique.mockResolvedValue(null)
    prismaMock.referralCode.create.mockResolvedValue({ id: 'ref-1', code: 'ABC123', userId: 'user-1' })

    const res = await app.inject({ method: 'POST', url: '/auth/signup', payload: { email: 'test@example.com', password: 'password123' } })

    expect(res.statusCode).toBe(201)
    expect(res.json()).toHaveProperty('access_token', 'tok')
    expect(res.json().user).toMatchObject({ id: 'user-1', email: 'test@example.com' })
  })

  it('returns 400 if password is under 8 characters', async () => {
    const res = await app.inject({ method: 'POST', url: '/auth/signup', payload: { email: 'test@example.com', password: 'short' } })
    expect(res.statusCode).toBe(400)
    expect(res.json()).toHaveProperty('error')
  })

  it('returns 400 if email is missing', async () => {
    const res = await app.inject({ method: 'POST', url: '/auth/signup', payload: { password: 'password123' } })
    expect(res.statusCode).toBe(400)
    expect(res.json()).toHaveProperty('error')
  })

  it('returns 409 if email already exists', async () => {
    supabaseMock.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'User already registered', status: 422 },
    })
    const res = await app.inject({ method: 'POST', url: '/auth/signup', payload: { email: 'existing@example.com', password: 'password123' } })
    expect(res.statusCode).toBe(409)
  })
})

// ─── POST /auth/login ─────────────────────────────────────────────────────────

describe('POST /auth/login', () => {
  it('returns access_token and user on valid credentials', async () => {
    supabaseMock.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@example.com' }, session: { access_token: 'tok' } },
      error: null,
    })
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'test@example.com', tier: 'FREE' })

    const res = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: 'test@example.com', password: 'password123' } })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toHaveProperty('access_token', 'tok')
    expect(res.json().user).toMatchObject({ id: 'user-1' })
  })

  it('returns 401 on wrong password', async () => {
    supabaseMock.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials', status: 400 },
    })
    const res = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: 'test@example.com', password: 'wrongpass' } })
    expect(res.statusCode).toBe(401)
  })

  it('returns 401 on unknown email', async () => {
    supabaseMock.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials', status: 400 },
    })
    const res = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: 'nobody@example.com', password: 'password123' } })
    expect(res.statusCode).toBe(401)
  })
})

// ─── POST /auth/logout ────────────────────────────────────────────────────────

describe('POST /auth/logout', () => {
  it('returns 200 when authenticated', async () => {
    supabaseMock.auth.signOut.mockResolvedValue({ error: null })
    const res = await app.inject({ method: 'POST', url: '/auth/logout', headers: { Authorization: `Bearer ${createAuthToken('user-1')}` } })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toHaveProperty('message')
  })

  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'POST', url: '/auth/logout' })
    expect(res.statusCode).toBe(401)
  })
})

// ─── GET /auth/me ─────────────────────────────────────────────────────────────

describe('GET /auth/me', () => {
  it('returns user when valid JWT provided', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'test@example.com', tier: 'FREE', profile: null })
    const res = await app.inject({ method: 'GET', url: '/auth/me', headers: { Authorization: `Bearer ${createAuthToken('user-1')}` } })
    expect(res.statusCode).toBe(200)
    expect(res.json().user).toMatchObject({ id: 'user-1' })
  })

  it('returns 401 when no token', async () => {
    const res = await app.inject({ method: 'GET', url: '/auth/me' })
    expect(res.statusCode).toBe(401)
  })

  it('returns 401 when token is expired', async () => {
    const jwt = require('jsonwebtoken')
    const expiredToken = jwt.sign({ sub: 'user-1' }, process.env.JWT_SECRET_TEST!, { expiresIn: -1 })
    const res = await app.inject({ method: 'GET', url: '/auth/me', headers: { Authorization: `Bearer ${expiredToken}` } })
    expect(res.statusCode).toBe(401)
  })
})
