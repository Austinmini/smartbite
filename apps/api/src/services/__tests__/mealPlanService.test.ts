jest.mock('../../lib/anthropic', () => ({
  anthropic: {
    messages: { create: jest.fn() },
  },
}))

import '../../test/mocks/prisma'
import { anthropic } from '../../lib/anthropic'
import { prisma } from '../../lib/prisma'
import { generateMealPlan, regenerateMeal, saveMealPlan } from '../mealPlanService'

const anthropicCreate = anthropic.messages.create as jest.Mock
const prismaMock = prisma as any

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

    expect(result.totalEstCost).toBeGreaterThan(0)
    expect(result.days).toHaveLength(7)
    expect(result.days.map((day) => day.dayOfWeek)).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(result.days[0].meals).toHaveLength(3)
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

    expect(result.totalEstCost).toBeGreaterThan(0)
  })

  it('throws on malformed JSON from Claude', async () => {
    anthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Sorry, I cannot generate a plan.' }],
    })

    await expect(
      generateMealPlan({ profile: mockProfile, weekBudget: 100 })
    ).rejects.toThrow()
  })

  it('uses the configured sonnet meal-plan model', async () => {
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

  it('requests a full 7-day weekly plan', async () => {
    anthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(mockPlanData) }],
    })

    await generateMealPlan({ profile: mockProfile, weekBudget: 100 })

    const prompt = anthropicCreate.mock.calls[0][0].messages[0].content as string
    expect(prompt).toContain('exactly 7 days')
    expect(prompt).toContain('dayOfWeek values 0, 1, 2, 3, 4, 5, 6')
    expect(prompt).toContain('BREAKFAST, LUNCH, DINNER')
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

  it('parses JSON when Claude wraps it with extra text', async () => {
    anthropicCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: `Here is your plan:\n${JSON.stringify(mockPlanData)}\nEnjoy!`,
        },
      ],
    })

    const result = await generateMealPlan({ profile: mockProfile, weekBudget: 100 })

    expect(result.totalEstCost).toBeGreaterThan(0)
  })
})

describe('saveMealPlan', () => {
  it('stores meal and plan costs using total recipe servings', async () => {
    prismaMock.mealPlan.create.mockResolvedValue({
      id: 'plan-1',
      totalEstCost: 5,
      meals: [],
    })

    await saveMealPlan('user-1', mockPlanData, 2)

    expect(prismaMock.mealPlan.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          totalEstCost: 5,
          meals: {
            create: [
              expect.objectContaining({
                estCost: 5,
                recipe: {
                  create: expect.objectContaining({
                    servings: 2,
                  }),
                },
              }),
            ],
          },
        }),
      })
    )
  })
})

describe('regenerateMeal', () => {
  it('stores regenerated meal cost as total recipe cost and updates plan total', async () => {
    prismaMock.meal.findFirst.mockResolvedValue({
      id: 'meal-1',
      mealPlanId: 'plan-1',
      recipeId: 'recipe-1',
      mealType: 'BREAKFAST',
      estCost: 5,
      recipe: { id: 'recipe-1' },
    })
    anthropicCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            mealType: 'BREAKFAST',
            title: 'Oats Bowl',
            estCostPerServing: 3,
            readyInMinutes: 12,
            tags: ['high-protein'],
            ingredients: [{ name: 'oats', amount: 1, unit: 'cup' }],
            instructions: [{ step: 1, text: 'Cook oats' }],
            nutrition: { calories: 320, protein: 20, carbs: 40, fat: 8 },
          }),
        },
      ],
    })
    prismaMock.recipe.update.mockResolvedValue({ id: 'recipe-1' })
    prismaMock.meal.update.mockResolvedValue({
      id: 'meal-1',
      mealPlanId: 'plan-1',
      estCost: 6,
      recipe: { id: 'recipe-1', servings: 2 },
    })
    prismaMock.meal.findMany.mockResolvedValue([
      { id: 'meal-1', mealPlanId: 'plan-1', estCost: 6 },
      { id: 'meal-2', mealPlanId: 'plan-1', estCost: 4 },
    ])
    prismaMock.mealPlan.update.mockResolvedValue({ id: 'plan-1', totalEstCost: 10 })

    const result = await regenerateMeal('plan-1', 'meal-1', mockProfile)

    expect(prismaMock.meal.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { estCost: 6 },
      })
    )
    expect(prismaMock.recipe.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          servings: 2,
        }),
      })
    )
    expect(prismaMock.mealPlan.update).toHaveBeenCalledWith({
      where: { id: 'plan-1' },
      data: { totalEstCost: 10 },
    })
    expect(result.totalEstCost).toBe(10)
  })
})
