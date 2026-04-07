import { prisma } from '../lib/prisma'

export const ONBOARDING_ACTIONS = [
  'profile_complete',
  'first_plan_generated',
  'first_scan',
  'first_purchase',
  'first_recipe_cooked',
] as const

export type OnboardingAction = (typeof ONBOARDING_ACTIONS)[number]

const LEGACY_ACTION_MAP: Record<string, OnboardingAction> = {
  GENERATED_PLAN: 'first_plan_generated',
  SCANNED_ITEM: 'first_scan',
  ADDED_PANTRY_ITEM: 'first_purchase',
  MARKED_RECIPE_COOKED: 'first_recipe_cooked',
}

export function normalizeCompletedActions(actions: string[] | null | undefined): OnboardingAction[] {
  const normalized = new Set<OnboardingAction>()

  for (const action of actions ?? []) {
    if (ONBOARDING_ACTIONS.includes(action as OnboardingAction)) {
      normalized.add(action as OnboardingAction)
      continue
    }

    const mapped = LEGACY_ACTION_MAP[action]
    if (mapped) normalized.add(mapped)
  }

  return [...normalized]
}

export async function markActionComplete(
  userId: string,
  action: OnboardingAction
): Promise<void> {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { completedActions: true },
  })

  if (!profile) return

  const completedActions = normalizeCompletedActions(profile.completedActions)
  if (completedActions.includes(action)) return

  await prisma.userProfile.update({
    where: { userId },
    data: { completedActions: [...completedActions, action] },
  })
}
