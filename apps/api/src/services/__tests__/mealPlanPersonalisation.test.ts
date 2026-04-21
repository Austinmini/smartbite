// Tests for Sprint 5 personalisation: generateMealPlan injects favourites + purchase history
// for Plus/Pro users, and uses AI_MODELS.MEAL_PLAN model constant

import '../../test/mocks/prisma'

jest.mock('../../lib/anthropic', () => ({
  anthropic: {
    messages: {
      create: jest.fn(),
    },
  },
}))

import { anthropic } from '../../lib/anthropic'
import { generateMealPlan } from '../mealPlanService'

const anthropicMock = anthropic.messages.create as jest.Mock

const baseMockPlanResponse = {
  content: [
    {
      type: 'text',
      text: JSON.stringify({
        totalEstCost: 80,
        days: [
          {
            dayOfWeek: 0,
            meals: [
              {
                mealType: 'BREAKFAST',
                title: 'Eggs and Toast',
                estCostPerServing: 2.5,
                readyInMinutes: 10,
                tags: ['quick'],
                ingredients: [{ name: 'eggs', amount: 2, unit: 'each' }],
                instructions: [{ step: 1, text: 'Cook eggs.' }],
                nutrition: { calories: 300, protein: 15, carbs: 30, fat: 10 },
              },
              {
                mealType: 'LUNCH',
                title: 'Chicken Salad',
                estCostPerServing: 4.0,
                readyInMinutes: 20,
                tags: ['high-protein'],
                ingredients: [{ name: 'chicken', amount: 1, unit: 'lb' }],
                instructions: [{ step: 1, text: 'Grill chicken.' }],
                nutrition: { calories: 450, protein: 40, carbs: 10, fat: 15 },
              },
              {
                mealType: 'DINNER',
                title: 'Pasta',
                estCostPerServing: 3.0,
                readyInMinutes: 25,
                tags: ['comfort'],
                ingredients: [{ name: 'pasta', amount: 200, unit: 'g' }],
                instructions: [{ step: 1, text: 'Boil pasta.' }],
                nutrition: { calories: 500, protein: 15, carbs: 80, fat: 8 },
              },
            ],
          },
        ],
      }),
    },
  ],
}

const baseProfile = {
  weeklyBudget: 100,
  dietaryGoals: ['high-protein'],
  allergies: [],
  cuisinePrefs: ['any'],
  cookingTimeMax: 30,
  servings: 2,
}

beforeEach(() => {
  jest.clearAllMocks()
  anthropicMock.mockResolvedValue(baseMockPlanResponse)
})

describe('generateMealPlan — personalisation (Sprint 5)', () => {
  it('uses AI_MODELS.MEAL_PLAN model constant (not hardcoded string)', async () => {
    await generateMealPlan({ profile: baseProfile, weekBudget: 100 })

    const callArgs = anthropicMock.mock.calls[0][0]
    // Should use the constant from aiConfig — defaults to claude-sonnet-4-6
    expect(callArgs.model).toBe('claude-sonnet-4-6')
  })

  it('includes favourites context in prompt when favourites are provided', async () => {
    const favourites = [
      { title: 'Chicken Tacos', timesCooked: 5, userRating: 5 },
      { title: 'Beef Stir Fry', timesCooked: 3, userRating: 4 },
    ]

    await generateMealPlan({ profile: baseProfile, weekBudget: 100, favourites })

    const callArgs = anthropicMock.mock.calls[0][0]
    const promptContent = callArgs.messages[0].content as string
    expect(promptContent).toContain('Chicken Tacos')
    expect(promptContent).toContain('Beef Stir Fry')
  })

  it('does not include favourites context when favourites list is empty', async () => {
    await generateMealPlan({ profile: baseProfile, weekBudget: 100, favourites: [] })

    const callArgs = anthropicMock.mock.calls[0][0]
    const promptContent = callArgs.messages[0].content as string
    expect(promptContent).not.toContain('most-cooked favourites')
  })

  it('uses lower max_tokens for FREE tier', async () => {
    await generateMealPlan({ profile: baseProfile, weekBudget: 100, tier: 'FREE' })

    const callArgs = anthropicMock.mock.calls[0][0]
    expect(callArgs.max_tokens).toBe(4000)
  })

  it('uses higher max_tokens for PRO tier', async () => {
    await generateMealPlan({ profile: baseProfile, weekBudget: 100, tier: 'PRO' })

    const callArgs = anthropicMock.mock.calls[0][0]
    expect(callArgs.max_tokens).toBe(6000)
  })
})
