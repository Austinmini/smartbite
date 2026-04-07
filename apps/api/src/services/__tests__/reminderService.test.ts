import '../../test/mocks/prisma'

jest.mock('../../lib/anthropic', () => ({
  anthropic: {
    messages: {
      create: jest.fn(),
    },
  },
}))

import { prisma } from '../../lib/prisma'
import { anthropic } from '../../lib/anthropic'
import { getReminderSuggestions } from '../reminderService'

const prismaMock = prisma as any
const anthropicMock = anthropic.messages.create as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
})

describe('getReminderSuggestions', () => {
  it('calls Claude Haiku and returns structured suggestions for items with >= 3 purchases', async () => {
    prismaMock.purchaseHistory.findMany.mockResolvedValue([
      { itemName: 'eggs', purchasedAt: new Date(), quantity: 12, unit: 'each', storeName: 'HEB' },
      { itemName: 'eggs', purchasedAt: new Date(Date.now() - 7 * 86400000), quantity: 12, unit: 'each', storeName: 'HEB' },
      { itemName: 'eggs', purchasedAt: new Date(Date.now() - 14 * 86400000), quantity: 12, unit: 'each', storeName: 'HEB' },
    ])

    anthropicMock.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify([
            {
              itemName: 'eggs',
              suggestedQuantity: 12,
              suggestedUnit: 'each',
              suggestedFrequencyDays: 7,
              confidence: 'high',
              reasoning: 'You buy eggs every 7 days, consistently 1 dozen.',
            },
          ]),
        },
      ],
    })

    const result = await getReminderSuggestions('user-1')

    expect(result).toHaveLength(1)
    expect(result[0].itemName).toBe('eggs')
    expect(result[0].confidence).toBe('high')
    expect(result[0]).toHaveProperty('reasoning')
  })

  it('uses rule-based fallback and skips Claude when all items have < 3 purchases', async () => {
    prismaMock.purchaseHistory.findMany.mockResolvedValue([
      { itemName: 'milk', purchasedAt: new Date(), quantity: 1, unit: 'gallon', storeName: 'HEB' },
      { itemName: 'milk', purchasedAt: new Date(Date.now() - 5 * 86400000), quantity: 1, unit: 'gallon', storeName: 'HEB' },
      // Only 2 purchases — below threshold
    ])

    const result = await getReminderSuggestions('user-1')

    // Claude should not be called
    expect(anthropicMock).not.toHaveBeenCalled()
    // Rule-based result or empty
    expect(Array.isArray(result)).toBe(true)
  })

  it('returns empty array when user has no purchase history', async () => {
    prismaMock.purchaseHistory.findMany.mockResolvedValue([])

    const result = await getReminderSuggestions('user-1')

    expect(result).toEqual([])
    expect(anthropicMock).not.toHaveBeenCalled()
  })

  it('only includes items with >= 3 purchases in the Claude prompt', async () => {
    prismaMock.purchaseHistory.findMany.mockResolvedValue([
      // eggs — 3 purchases (qualifies)
      { itemName: 'eggs', purchasedAt: new Date(), quantity: 12, unit: 'each', storeName: 'HEB' },
      { itemName: 'eggs', purchasedAt: new Date(Date.now() - 7 * 86400000), quantity: 12, unit: 'each', storeName: 'HEB' },
      { itemName: 'eggs', purchasedAt: new Date(Date.now() - 14 * 86400000), quantity: 12, unit: 'each', storeName: 'HEB' },
      // bread — 2 purchases (below threshold)
      { itemName: 'bread', purchasedAt: new Date(), quantity: 1, unit: 'loaf', storeName: 'HEB' },
      { itemName: 'bread', purchasedAt: new Date(Date.now() - 10 * 86400000), quantity: 1, unit: 'loaf', storeName: 'HEB' },
    ])

    anthropicMock.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify([]) }],
    })

    await getReminderSuggestions('user-1')

    // Verify Claude was called (eggs qualifies) and the prompt doesn't include bread
    expect(anthropicMock).toHaveBeenCalledTimes(1)
    const callArgs = anthropicMock.mock.calls[0][0]
    const promptContent = callArgs.messages[0].content as string
    expect(promptContent).toContain('eggs')
    expect(promptContent).not.toContain('bread')
  })

  it('uses AI_MODELS.REMINDERS model (Haiku by default)', async () => {
    prismaMock.purchaseHistory.findMany.mockResolvedValue([
      { itemName: 'eggs', purchasedAt: new Date(), quantity: 12, unit: 'each', storeName: 'HEB' },
      { itemName: 'eggs', purchasedAt: new Date(Date.now() - 7 * 86400000), quantity: 12, unit: 'each', storeName: 'HEB' },
      { itemName: 'eggs', purchasedAt: new Date(Date.now() - 14 * 86400000), quantity: 12, unit: 'each', storeName: 'HEB' },
    ])

    anthropicMock.mockResolvedValue({
      content: [{ type: 'text', text: '[]' }],
    })

    await getReminderSuggestions('user-1')

    const callArgs = anthropicMock.mock.calls[0][0]
    expect(callArgs.model).toBe('claude-haiku-4-5-20251001')
  })
})
