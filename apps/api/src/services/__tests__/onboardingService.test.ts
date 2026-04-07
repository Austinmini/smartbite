import '../../test/mocks/prisma'

import { prisma } from '../../lib/prisma'
import { markActionComplete, ONBOARDING_ACTIONS } from '../onboardingService'

const prismaMock = prisma as any

beforeEach(() => {
  jest.clearAllMocks()
})

describe('markActionComplete', () => {
  it('adds a new action to completedActions if not already present', async () => {
    prismaMock.userProfile.findUnique.mockResolvedValue({
      userId: 'user-1',
      completedActions: ['GENERATED_PLAN'],
    })
    prismaMock.userProfile.update.mockResolvedValue({
      userId: 'user-1',
      completedActions: ['GENERATED_PLAN', 'SCANNED_ITEM'],
    })

    await markActionComplete('user-1', 'SCANNED_ITEM')

    expect(prismaMock.userProfile.update).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: { completedActions: ['GENERATED_PLAN', 'SCANNED_ITEM'] },
    })
  })

  it('does not duplicate an action already in completedActions', async () => {
    prismaMock.userProfile.findUnique.mockResolvedValue({
      userId: 'user-1',
      completedActions: ['GENERATED_PLAN'],
    })
    prismaMock.userProfile.update.mockResolvedValue({
      userId: 'user-1',
      completedActions: ['GENERATED_PLAN'],
    })

    await markActionComplete('user-1', 'GENERATED_PLAN')

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
      completedActions: ['ADDED_PANTRY_ITEM'],
    })

    await markActionComplete('user-1', 'ADDED_PANTRY_ITEM')

    expect(prismaMock.userProfile.update).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: { completedActions: ['ADDED_PANTRY_ITEM'] },
    })
  })

  it('does nothing when user profile does not exist', async () => {
    prismaMock.userProfile.findUnique.mockResolvedValue(null)

    await markActionComplete('user-1', 'GENERATED_PLAN')

    expect(prismaMock.userProfile.update).not.toHaveBeenCalled()
  })
})

describe('ONBOARDING_ACTIONS', () => {
  it('exports the 5 expected onboarding action keys', () => {
    expect(ONBOARDING_ACTIONS).toContain('GENERATED_PLAN')
    expect(ONBOARDING_ACTIONS).toContain('SCANNED_ITEM')
    expect(ONBOARDING_ACTIONS).toContain('ADDED_PANTRY_ITEM')
    expect(ONBOARDING_ACTIONS).toContain('MARKED_RECIPE_COOKED')
    expect(ONBOARDING_ACTIONS).toContain('SAVED_RECIPE')
    expect(ONBOARDING_ACTIONS).toHaveLength(5)
  })
})
