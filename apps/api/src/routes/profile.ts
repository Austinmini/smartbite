import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { verifyJWT } from '../middleware/auth'
import { V1_SUPPORTED_CHAINS } from '../data/txStores'

function validateRetailers(retailers: unknown): string | null {
  if (!Array.isArray(retailers)) return 'preferredRetailers must be an array'
  if (retailers.length > 2) return 'Maximum 2 preferred retailers allowed'
  const invalid = retailers.filter((r) => !V1_SUPPORTED_CHAINS.includes(r as any))
  if (invalid.length > 0) return `Unsupported chains: ${invalid.join(', ')}. Must be one of the V1 supported chains`
  return null
}

export async function profileRoute(app: FastifyInstance) {
  const auth = { preHandler: verifyJWT }

  // GET /profile
  app.get('/', auth, async (request, reply) => {
    const profile = await prisma.userProfile.findUnique({ where: { userId: request.userId } })
    if (!profile) return reply.status(404).send({ error: 'Profile not found' })
    return reply.send({ profile })
  })

  // PUT /profile
  app.put<{ Body: Record<string, unknown> }>('/', auth, async (request, reply) => {
    const body = request.body ?? {}
    const { weeklyBudget, location, preferredRetailers, dietaryGoals, allergies, cuisinePrefs, cookingTimeMax, servings } = body

    if (preferredRetailers !== undefined) {
      const err = validateRetailers(preferredRetailers)
      if (err) return reply.status(400).send({ error: err })
    }

    const profile = await prisma.userProfile.upsert({
      where: { userId: request.userId },
      update: {
        ...(weeklyBudget !== undefined && { weeklyBudget: Number(weeklyBudget) }),
        ...(location !== undefined && location !== null && { location }),
        ...(preferredRetailers !== undefined && { preferredRetailers: preferredRetailers as string[] }),
        ...(dietaryGoals !== undefined && { dietaryGoals: dietaryGoals as string[] }),
        ...(allergies !== undefined && { allergies: allergies as string[] }),
        ...(cuisinePrefs !== undefined && { cuisinePrefs: cuisinePrefs as string[] }),
        ...(cookingTimeMax !== undefined && { cookingTimeMax: Number(cookingTimeMax) }),
        ...(servings !== undefined && { servings: Number(servings) }),
      },
      create: {
        userId: request.userId,
        weeklyBudget: Number(weeklyBudget ?? 100),
        location: (location as object) ?? {},
        preferredRetailers: (preferredRetailers as string[]) ?? [],
        dietaryGoals: (dietaryGoals as string[]) ?? [],
        allergies: (allergies as string[]) ?? [],
        cuisinePrefs: (cuisinePrefs as string[]) ?? [],
        cookingTimeMax: Number(cookingTimeMax ?? 60),
        servings: Number(servings ?? 2),
      },
    })

    return reply.send({ profile })
  })

  // PUT /profile/retailers
  app.put<{ Body: { preferredRetailers: string[] } }>('/retailers', auth, async (request, reply) => {
    const { preferredRetailers } = request.body ?? {}
    const err = validateRetailers(preferredRetailers)
    if (err) return reply.status(400).send({ error: err })

    const profile = await prisma.userProfile.update({
      where: { userId: request.userId },
      data: { preferredRetailers },
    })
    return reply.send({ profile })
  })

  // PUT /profile/dietary
  app.put<{ Body: { dietaryGoals?: string[]; allergies?: string[] } }>('/dietary', auth, async (request, reply) => {
    const { dietaryGoals, allergies } = request.body ?? {}
    const profile = await prisma.userProfile.update({
      where: { userId: request.userId },
      data: {
        ...(dietaryGoals !== undefined && { dietaryGoals }),
        ...(allergies !== undefined && { allergies }),
      },
    })
    return reply.send({ profile })
  })
}
