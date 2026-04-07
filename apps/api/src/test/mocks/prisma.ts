// Centralised Prisma mock — import this in any test that touches the DB
// Usage: import { prismaMock } from '../mocks/prisma'

import { prisma } from '../../lib/prisma'

jest.mock('../../lib/prisma', () => ({
  prisma: {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    userProfile: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
    referralCode: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    mealPlan: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    meal: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    recipe: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    priceObservation: {
      create: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    canonicalPrice: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    bitesLedger: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    bitesBalance: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    userBadge: {
      findMany: jest.fn(),
      createMany: jest.fn(),
    },
    scanStreak: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    purchaseHistory: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    pantryItem: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    pantryLedger: {
      create: jest.fn(),
    },
    favourite: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    collection: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    feedback: {
      create: jest.fn(),
    },
    referralEvent: {
      count: jest.fn(),
    },
    referralReward: {
      aggregate: jest.fn(),
    },
    priceAlert: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
    purchaseReminder: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    announcement: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
    $disconnect: jest.fn(),
  },
}))

export const prismaMock = prisma as jest.Mocked<typeof prisma>
