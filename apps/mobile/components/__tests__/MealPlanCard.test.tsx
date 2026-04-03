import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { MealPlanCard } from '../MealPlanCard'

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
    {
      id: 'meal-2',
      mealPlanId: 'plan-1',
      dayOfWeek: 0,
      mealType: 'LUNCH' as const,
      estCost: 5.0,
      bestStore: '',
      recipe: {
        id: 'recipe-2',
        title: 'Chicken Salad',
        readyInMinutes: 15,
        servings: 2,
        ingredients: [{ name: 'chicken', amount: 200, unit: 'g' }],
        instructions: [{ step: 1, text: 'Mix ingredients' }],
        nutrition: { calories: 450, protein: 40, carbs: 20, fat: 12 },
        tags: ['high-protein'],
        imageUrl: null,
      },
    },
  ],
}

describe('MealPlanCard', () => {
  it('shows estimated weekly cost with ~ prefix', () => {
    const { getByText } = render(<MealPlanCard plan={mockPlan} onMealPress={() => {}} />)
    expect(getByText(/~\$95\.50/)).toBeTruthy()
  })

  it('shows day tab labels', () => {
    const { getByText } = render(<MealPlanCard plan={mockPlan} onMealPress={() => {}} />)
    expect(getByText('Mon')).toBeTruthy()
  })

  it('shows meals for the selected day', () => {
    const { getByText } = render(<MealPlanCard plan={mockPlan} onMealPress={() => {}} />)
    expect(getByText('Scrambled Eggs')).toBeTruthy()
    expect(getByText('Chicken Salad')).toBeTruthy()
  })

  it('calls onMealPress with the meal when a meal is tapped', () => {
    const onMealPress = jest.fn()
    const { getByTestId } = render(<MealPlanCard plan={mockPlan} onMealPress={onMealPress} />)
    fireEvent.press(getByTestId('recipe-card-meal-1'))
    expect(onMealPress).toHaveBeenCalledWith(mockPlan.meals[0])
  })

  it('switches to a different day when a day tab is tapped', () => {
    const { getByTestId, queryByText } = render(
      <MealPlanCard plan={mockPlan} onMealPress={() => {}} />
    )
    // Tap Tue tab (dayOfWeek=1, no meals)
    fireEvent.press(getByTestId('day-tab-1'))
    expect(queryByText('Scrambled Eggs')).toBeNull()
  })
})
