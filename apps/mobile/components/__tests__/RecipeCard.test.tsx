import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { RecipeCard } from '../RecipeCard'

const mockMeal = {
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
}

describe('RecipeCard', () => {
  it('renders the recipe title', () => {
    const { getByText } = render(<RecipeCard meal={mockMeal} onPress={() => {}} />)
    expect(getByText('Scrambled Eggs')).toBeTruthy()
  })

  it('shows cook time in minutes', () => {
    const { getByText } = render(<RecipeCard meal={mockMeal} onPress={() => {}} />)
    expect(getByText('10 min')).toBeTruthy()
  })

  it('shows estimated total recipe cost', () => {
    const { getByText } = render(<RecipeCard meal={mockMeal} onPress={() => {}} />)
    expect(getByText('~$2.50 total')).toBeTruthy()
  })

  it('shows meal type label', () => {
    const { getByText } = render(<RecipeCard meal={mockMeal} onPress={() => {}} />)
    expect(getByText('BREAKFAST')).toBeTruthy()
  })

  it('calls onPress when tapped', () => {
    const onPress = jest.fn()
    const { getByTestId } = render(<RecipeCard meal={mockMeal} onPress={onPress} />)
    fireEvent.press(getByTestId('recipe-card-meal-1'))
    expect(onPress).toHaveBeenCalledWith(mockMeal)
  })
})
