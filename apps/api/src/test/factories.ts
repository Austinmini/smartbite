import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma'

export async function createTestUser(overrides: Record<string, unknown> = {}) {
  return prisma.user.create({
    data: {
      email: `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
      tier: 'FREE',
      ...overrides,
    },
  })
}

export async function createTestProfile(userId: string, overrides: Record<string, unknown> = {}) {
  return prisma.userProfile.create({
    data: {
      userId,
      weeklyBudget: 100,
      location: { zip: '78701', lat: 30.27, lng: -97.74, city: 'Austin' },
      preferredRetailers: ['heb', 'walmart'],
      dietaryGoals: ['high-protein'],
      allergies: [],
      cookingTimeMax: 30,
      servings: 2,
      ...overrides,
    },
  })
}

export function createAuthToken(userId: string): string {
  const secret = process.env.JWT_SECRET_TEST
  if (!secret) throw new Error('JWT_SECRET_TEST not set — check .env.test')
  return jwt.sign({ sub: userId }, secret, { expiresIn: '1h' })
}
