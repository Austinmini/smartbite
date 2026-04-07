// Tests for getAiPriceSuggestion — calls Claude Haiku with trend data, returns structured suggestion
import '../../test/mocks/prisma'

jest.mock('../../lib/anthropic', () => ({
  anthropic: {
    messages: {
      create: jest.fn(),
    },
  },
}))

import { anthropic } from '../../lib/anthropic'
import { getAiPriceSuggestion } from '../priceTrendService'

const anthropicMock = anthropic.messages.create as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
})

describe('getAiPriceSuggestion', () => {
  const trendData = [
    { week: '2026-W10', avgPrice: 3.0, observationCount: 5 },
    { week: '2026-W11', avgPrice: 3.5, observationCount: 4 },
  ]

  it('calls Claude and returns a structured suggestion', async () => {
    anthropicMock.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            action: 'buy',
            reasoning: 'Chicken breast is up 16% — stock up now.',
            confidence: 'high',
          }),
        },
      ],
    })

    const result = await getAiPriceSuggestion({
      ingredient: 'chicken breast',
      storeId: 'heb',
      trendData,
    })

    expect(result.action).toBe('buy')
    expect(result.reasoning).toBeTruthy()
    expect(['buy', 'hold', 'substitute']).toContain(result.action)
    expect(['high', 'medium', 'low']).toContain(result.confidence)
  })

  it('uses AI_MODELS.PRICE_SUGGEST (Haiku by default)', async () => {
    anthropicMock.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({ action: 'hold', reasoning: 'Stable price.', confidence: 'medium' }) }],
    })

    await getAiPriceSuggestion({ ingredient: 'milk', storeId: 'heb', trendData })

    const callArgs = anthropicMock.mock.calls[0][0]
    expect(callArgs.model).toBe('claude-haiku-4-5-20251001')
  })

  it('returns a fallback suggestion when Claude returns malformed JSON', async () => {
    anthropicMock.mockResolvedValue({
      content: [{ type: 'text', text: 'not valid json' }],
    })

    const result = await getAiPriceSuggestion({ ingredient: 'eggs', storeId: 'heb', trendData })

    expect(result).toHaveProperty('action')
    expect(result).toHaveProperty('reasoning')
  })

  it('returns hold suggestion when trend data is insufficient (< 2 buckets)', async () => {
    const result = await getAiPriceSuggestion({
      ingredient: 'avocado',
      storeId: 'heb',
      trendData: [{ week: '2026-W11', avgPrice: 1.5, observationCount: 2 }],
    })

    // Should not call Claude — not enough data
    expect(anthropicMock).not.toHaveBeenCalled()
    expect(result.action).toBe('hold')
    expect(result.reasoning).toContain('insufficient')
  })
})
