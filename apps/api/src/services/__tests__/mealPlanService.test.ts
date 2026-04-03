jest.mock('../../lib/anthropic', () => ({
  anthropic: {
    messages: { create: jest.fn() },
  },
}))

import { anthropic } from '../../lib/anthropic'
import { generateMealPlan } from '../mealPlanService'

const anthropicCreate = anthropic.messages.create as jest.Mock

const mockProfile = {
  weeklyBudget: 100,
  dietaryGoals: ['high-protein'],
  allergies: [] as string[],
  cuisinePrefs: ['Mexican'],
  cookingTimeMax: 30,
  servings: 2,
}

const mockPlanData = {
  totalEstCost: 95.5,
  days: [
    {
      dayOfWeek: 0,
      meals: [
        {
          mealType: 'BREAKFAST',
          title: 'Scrambled Eggs',
          estCostPerServing: 2.5,
          readyInMinutes: 10,
          tags: ['high-protein'],
          ingredients: [{ name: 'eggs', amount: 3, unit: 'whole' }],
          instructions: [{ step: 1, text: 'Scramble eggs in a pan' }],
          nutrition: { calories: 300, protein: 20, carbs: 5, fat: 15 },
        },
      ],
    },
  ],
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('generateMealPlan', () => {
  it('returns a valid plan structure from Claude response', async () => {
    anthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(mockPlanData) }],
    })

    const result = await generateMealPlan({ profile: mockProfile, weekBudget: 100 })

    expect(result.totalEstCost).toBe(95.5)
    expect(result.days).toHaveLength(1)
    expect(result.days[0].meals[0].title).toBe('Scrambled Eggs')
    expect(result.days[0].meals[0].nutrition.calories).toBe(300)
  })

  it('strips markdown fences from Claude response', async () => {
    anthropicCreate.mockResolvedValue({
      content: [
        { type: 'text', text: '```json\n' + JSON.stringify(mockPlanData) + '\n```' },
      ],
    })

    const result = await generateMealPlan({ profile: mockProfile, weekBudget: 100 })

    expect(result.totalEstCost).toBe(95.5)
  })

  it('throws on malformed JSON from Claude', async () => {
    anthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Sorry, I cannot generate a plan.' }],
    })

    await expect(
      generateMealPlan({ profile: mockProfile, weekBudget: 100 })
    ).rejects.toThrow()
  })

  it('uses claude-sonnet-4-6 model', async () => {
    anthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(mockPlanData) }],
    })

    await generateMealPlan({ profile: mockProfile, weekBudget: 100 })

    expect(anthropicCreate.mock.calls[0][0].model).toBe('claude-sonnet-4-6')
  })

  it('includes dietary restrictions in the Claude prompt', async () => {
    anthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(mockPlanData) }],
    })

    await generateMealPlan({
      profile: { ...mockProfile, allergies: ['nuts', 'gluten'] },
      weekBudget: 100,
    })

    const prompt = anthropicCreate.mock.calls[0][0].messages[0].content as string
    expect(prompt).toContain('nuts')
    expect(prompt).toContain('gluten')
  })

  it('includes weekly budget in the prompt', async () => {
    anthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(mockPlanData) }],
    })

    await generateMealPlan({ profile: mockProfile, weekBudget: 150 })

    const prompt = anthropicCreate.mock.calls[0][0].messages[0].content as string
    expect(prompt).toContain('150')
  })

  it('includes favourites context when provided', async () => {
    anthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(mockPlanData) }],
    })

    const favourites = [
      { title: 'Chicken Tacos', timesCooked: 5, userRating: 5 },
    ]
    await generateMealPlan({ profile: mockProfile, weekBudget: 100, favourites })

    const prompt = anthropicCreate.mock.calls[0][0].messages[0].content as string
    expect(prompt).toContain('Chicken Tacos')
    expect(prompt).toContain('5x')
  })

  it('omits favourites context when not provided', async () => {
    anthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(mockPlanData) }],
    })

    await generateMealPlan({ profile: mockProfile, weekBudget: 100 })

    const prompt = anthropicCreate.mock.calls[0][0].messages[0].content as string
    expect(prompt).not.toContain('most-cooked')
  })
})
