import type { FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { verifyJWT } from '../middleware/auth'
import { V1_SUPPORTED_CHAINS } from '../data/txStores'
import { markActionComplete, normalizeCompletedActions } from '../services/onboardingService'

function validateRetailers(retailers: unknown): string | null {
  if (!Array.isArray(retailers)) return 'preferredRetailers must be an array'
  if (retailers.length > 2) return 'Maximum 2 preferred retailers allowed'
  const invalid = retailers.filter((r) => !V1_SUPPORTED_CHAINS.includes(r as any))
  if (invalid.length > 0) return `Unsupported chains: ${invalid.join(', ')}. Must be one of the V1 supported chains`
  return null
}

interface SelectedStoreInput {
  id: string
  name: string
  chain: string
  distanceMiles: number
  address: string
  lat: number
  lng: number
}

function normalizeSelectedStores(value: unknown): SelectedStoreInput[] | null {
  if (value === undefined) return null
  if (!Array.isArray(value)) return []

  return value
    .filter(
      (store): store is SelectedStoreInput =>
        Boolean(store) &&
        typeof store === 'object' &&
        typeof (store as SelectedStoreInput).id === 'string' &&
        typeof (store as SelectedStoreInput).name === 'string' &&
        typeof (store as SelectedStoreInput).chain === 'string' &&
        typeof (store as SelectedStoreInput).distanceMiles === 'number' &&
        typeof (store as SelectedStoreInput).address === 'string' &&
        typeof (store as SelectedStoreInput).lat === 'number' &&
        typeof (store as SelectedStoreInput).lng === 'number'
    )
    .slice(0, 2)
}

function validateSelectedStores(
  preferredRetailers: unknown,
  selectedStores: SelectedStoreInput[] | null
): string | null {
  if (selectedStores === null) return null
  if (selectedStores.length > 2) return 'Maximum 2 selectedStores allowed'

  if (!Array.isArray(preferredRetailers)) {
    return 'selectedStores requires preferredRetailers to be an array'
  }

  const selectedChains = selectedStores.map((store) => store.chain)
  const mismatch =
    selectedChains.length !== preferredRetailers.length ||
    selectedChains.some((chain) => !preferredRetailers.includes(chain))

  if (mismatch) {
    return 'selectedStores must match preferredRetailers exactly'
  }

  return null
}

export async function profileRoute(app: FastifyInstance) {
  const auth = { preHandler: verifyJWT }

  // GET /profile
  app.get('/', auth, async (request, reply) => {
    const profile = await prisma.userProfile.findUnique({ where: { userId: request.userId } })
    if (!profile) return reply.status(404).send({ error: 'Profile not found' })
    return reply.send({
      profile: {
        ...profile,
        completedActions: normalizeCompletedActions(profile.completedActions),
      },
    })
  })

  // GET /profile/checklist
  app.get('/checklist', auth, async (request, reply) => {
    const [profile, hasPlan, hasPurchase] = await Promise.all([
      prisma.userProfile.findUnique({
        where: { userId: request.userId },
        select: { completedActions: true, scanCount: true },
      }),
      prisma.mealPlan.findFirst({
        where: { userId: request.userId },
        select: { id: true },
      }),
      prisma.purchaseHistory.findFirst({
        where: { userId: request.userId },
        select: { id: true },
      }),
    ])

    if (!profile) return reply.status(404).send({ error: 'Profile not found' })

    const completedActions = new Set(normalizeCompletedActions(profile.completedActions))
    completedActions.add('profile_complete')
    if (hasPlan) completedActions.add('first_plan_generated')
    if ((profile.scanCount ?? 0) > 0) completedActions.add('first_scan')
    if (hasPurchase) completedActions.add('first_purchase')

    return reply.send({ completedActions: [...completedActions] })
  })

  // PUT /profile
  app.put<{ Body: Record<string, unknown> }>('/', auth, async (request, reply) => {
    const body = request.body ?? {}
    const {
      weeklyBudget,
      location,
      preferredRetailers,
      selectedStores,
      dietaryGoals,
      allergies,
      cuisinePrefs,
      cookingTimeMax,
      servings,
    } = body
    const normalizedSelectedStores = normalizeSelectedStores(selectedStores)

    if (preferredRetailers !== undefined) {
      const err = validateRetailers(preferredRetailers)
      if (err) return reply.status(400).send({ error: err })
    }

    const selectedStoresError = validateSelectedStores(preferredRetailers, normalizedSelectedStores)
    if (selectedStoresError) return reply.status(400).send({ error: selectedStoresError })

    const maxStores =
      normalizedSelectedStores !== null
        ? normalizedSelectedStores.length || (Array.isArray(preferredRetailers) ? preferredRetailers.length : 1)
        : Array.isArray(preferredRetailers)
          ? preferredRetailers.length
          : undefined
    const selectedStoresJson =
      normalizedSelectedStores !== null
        ? (normalizedSelectedStores as unknown as Prisma.InputJsonValue)
        : undefined

    const profile = await prisma.userProfile.upsert({
      where: { userId: request.userId },
      update: {
        ...(weeklyBudget !== undefined && { weeklyBudget: Number(weeklyBudget) }),
        ...(location !== undefined && location !== null && { location }),
        ...(preferredRetailers !== undefined && { preferredRetailers: preferredRetailers as string[] }),
        ...(selectedStoresJson !== undefined && { selectedStores: selectedStoresJson }),
        ...(maxStores !== undefined && { maxStores }),
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
        selectedStores: (selectedStoresJson ?? []) as Prisma.InputJsonValue,
        maxStores: maxStores ?? 1,
        dietaryGoals: (dietaryGoals as string[]) ?? [],
        allergies: (allergies as string[]) ?? [],
        cuisinePrefs: (cuisinePrefs as string[]) ?? [],
        cookingTimeMax: Number(cookingTimeMax ?? 60),
        servings: Number(servings ?? 2),
      },
    })

    await markActionComplete(request.userId, 'profile_complete')

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
