import '../../test/mocks/prisma'
import { prisma } from '../../lib/prisma'
import { expireTrials, sendTrialEndingReminders } from '../trialJobs'

const prismaMock = prisma as any

// Mock push notification
jest.mock('../../services/notificationService', () => ({
  sendPushNotification: jest.fn().mockResolvedValue(undefined),
}))
import { sendPushNotification } from '../../services/notificationService'

beforeEach(() => { jest.clearAllMocks() })

describe('expireTrials', () => {
  it('downgrades PRO users with expired trialEndsAt and no RevenueCat subscription', async () => {
    prismaMock.user.findMany.mockResolvedValue([
      { id: 'user-1' },
      { id: 'user-2' },
    ])
    prismaMock.user.update.mockResolvedValue({})

    await expireTrials()

    expect(prismaMock.user.update).toHaveBeenCalledTimes(2)
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: { tier: 'FREE', trialEndsAt: null },
      })
    )
  })

  it('sends push notification to each expired user', async () => {
    prismaMock.user.findMany.mockResolvedValue([{ id: 'user-3' }])
    prismaMock.user.update.mockResolvedValue({})

    await expireTrials()

    expect(sendPushNotification).toHaveBeenCalledWith(
      'user-3',
      expect.objectContaining({ title: expect.stringContaining('ended') })
    )
  })

  it('does nothing when no trials have expired', async () => {
    prismaMock.user.findMany.mockResolvedValue([])

    await expireTrials()

    expect(prismaMock.user.update).not.toHaveBeenCalled()
    expect(sendPushNotification).not.toHaveBeenCalled()
  })
})

describe('sendTrialEndingReminders', () => {
  it('sends reminder to users whose trial ends within 24h', async () => {
    prismaMock.user.findMany.mockResolvedValue([{ id: 'user-4' }])

    await sendTrialEndingReminders()

    expect(sendPushNotification).toHaveBeenCalledWith(
      'user-4',
      expect.objectContaining({ title: expect.stringContaining('tomorrow') })
    )
  })

  it('does not send when no users are expiring soon', async () => {
    prismaMock.user.findMany.mockResolvedValue([])

    await sendTrialEndingReminders()

    expect(sendPushNotification).not.toHaveBeenCalled()
  })
})
