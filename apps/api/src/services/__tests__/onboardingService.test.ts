import '../../test/mocks/prisma'

import { prisma } from '../../lib/prisma'
import { markActionComplete, normalizeCompletedActions, ONBOARDING_ACTIONS } from '../onboardingService'

const prismaMock = prisma as any

beforeEach(() => {
  jest.clearAllMocks()
})

describe('markActionComplete', () => {
  it('adds a new action to completedActions if not already present', async () => {
    prismaMock.userProfile.findUnique.mockResolvedValue({
      userId: 'user-1',
      completedActions: ['first_plan_generated'],
    })
    prismaMock.userProfile.update.mockResolvedValue({
      userId: 'user-1',
      completedActions: ['first_plan_generated', 'first_scan'],
    })

    await markActionComplete('user-1', 'first_scan')

    expect(prismaMock.userProfile.update).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: { completedActions: ['first_plan_generated', 'first_scan'] },
    })
  })

  it('does not duplicate an action already in completedActions', async () => {
    prismaMock.userProfile.findUnique.mockResolvedValue({
      userId: 'user-1',
      completedActions: ['first_plan_generated'],
    })
    prismaMock.userProfile.update.mockResolvedValue({
      userId: 'user-1',
      completedActions: ['first_plan_generated'],
    })

    await markActionComplete('user-1', 'first_plan_generated')

    // update should NOT have been called — action already present
    expect(prismaMock.userProfile.update).not.toHaveBeenCalled()
  })

  it('handles a user with no completedActions yet (null/empty)', async () => {
    prismaMock.userProfile.findUnique.mockResolvedValue({
      userId: 'user-1',
      completedActions: [],
    })
    prismaMock.userProfile.update.mockResolvedValue({
      userId: 'user-1',
      completedActions: ['first_purchase'],
    })

    await markActionComplete('user-1', 'first_purchase')

    expect(prismaMock.userProfile.update).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: { completedActions: ['first_purchase'] },
    })
  })

  it('does nothing when user profile does not exist', async () => {
    prismaMock.userProfile.findUnique.mockResolvedValue(null)

    await markActionComplete('user-1', 'first_plan_generated')

    expect(prismaMock.userProfile.update).not.toHaveBeenCalled()
  })
})

describe('ONBOARDING_ACTIONS', () => {
  it('exports the 5 expected onboarding action keys', () => {
    expect(ONBOARDING_ACTIONS).toContain('profile_complete')
    expect(ONBOARDING_ACTIONS).toContain('first_plan_generated')
    expect(ONBOARDING_ACTIONS).toContain('first_scan')
    expect(ONBOARDING_ACTIONS).toContain('first_purchase')
    expect(ONBOARDING_ACTIONS).toContain('first_recipe_cooked')
    expect(ONBOARDING_ACTIONS).toHaveLength(5)
  })
})

describe('normalizeCompletedActions', () => {
  it('maps legacy action names to the new checklist keys', () => {
    expect(normalizeCompletedActions(['GENERATED_PLAN', 'SCANNED_ITEM'])).toEqual([
      'first_plan_generated',
      'first_scan',
    ])
  })
})
