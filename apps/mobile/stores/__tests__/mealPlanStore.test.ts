jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}))

import { useMealPlanStore } from '../mealPlanStore'

const mockPlan = {
  id: 'plan-1',
  userId: 'user-1',
  weekStarting: '2026-03-30T00:00:00.000Z',
  totalEstCost: 95.5,
  createdAt: '2026-04-01T00:00:00.000Z',
  meals: [
    {
      id: 'meal-1',
      mealPlanId: 'plan-1',
      dayOfWeek: 0,
      mealType: 'BREAKFAST' as const,
      estCost: 2.5,
      bestStore: '',
      recipe: {
        id: 'recipe-1',
        title: 'Scrambled Eggs',
        readyInMinutes: 10,
        servings: 2,
        ingredients: [{ name: 'eggs', amount: 3, unit: 'whole' }],
        instructions: [{ step: 1, text: 'Scramble eggs in a pan' }],
        nutrition: { calories: 300, protein: 20, carbs: 5, fat: 15 },
        tags: ['high-protein'],
        imageUrl: null,
      },
    },
  ],
}

beforeEach(() => {
  useMealPlanStore.setState({ plan: null, isGenerating: false, error: null })
})

describe('mealPlanStore', () => {
  it('starts with no plan', () => {
    expect(useMealPlanStore.getState().plan).toBeNull()
  })

  it('sets the plan via setPlan', () => {
    useMealPlanStore.getState().setPlan(mockPlan)
    expect(useMealPlanStore.getState().plan).toEqual(mockPlan)
    expect(useMealPlanStore.getState().plan?.id).toBe('plan-1')
  })

  it('clears the plan via clearPlan', () => {
    useMealPlanStore.getState().setPlan(mockPlan)
    useMealPlanStore.getState().clearPlan()
    expect(useMealPlanStore.getState().plan).toBeNull()
  })

  it('sets isGenerating state', () => {
    expect(useMealPlanStore.getState().isGenerating).toBe(false)
    useMealPlanStore.getState().setGenerating(true)
    expect(useMealPlanStore.getState().isGenerating).toBe(true)
  })

  it('sets and clears error state', () => {
    useMealPlanStore.getState().setError('Something went wrong')
    expect(useMealPlanStore.getState().error).toBe('Something went wrong')
    useMealPlanStore.getState().setError(null)
    expect(useMealPlanStore.getState().error).toBeNull()
  })
})
