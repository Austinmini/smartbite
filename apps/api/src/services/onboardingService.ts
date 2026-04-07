import { prisma } from '../lib/prisma'

export const ONBOARDING_ACTIONS = [
  'GENERATED_PLAN',
  'SCANNED_ITEM',
  'ADDED_PANTRY_ITEM',
  'MARKED_RECIPE_COOKED',
  'SAVED_RECIPE',
] as const

export type OnboardingAction = (typeof ONBOARDING_ACTIONS)[number]

export async function markActionComplete(
  userId: string,
  action: OnboardingAction
): Promise<void> {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { completedActions: true },
  })

  if (!profile) return

  if (profile.completedActions.includes(action)) return

  await prisma.userProfile.update({
    where: { userId },
    data: { completedActions: [...profile.completedActions, action] },
  })
}
