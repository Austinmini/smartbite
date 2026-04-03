import React from 'react'
import { render } from '@testing-library/react-native'
import { NutritionCard } from '../NutritionCard'

const mockNutrition = {
  calories: 520,
  protein: 35,
  carbs: 48,
  fat: 18,
}

describe('NutritionCard', () => {
  it('shows calorie count', () => {
    const { getByText } = render(<NutritionCard nutrition={mockNutrition} />)
    expect(getByText('520')).toBeTruthy()
  })

  it('shows protein grams', () => {
    const { getByText } = render(<NutritionCard nutrition={mockNutrition} />)
    expect(getByText('35g')).toBeTruthy()
  })

  it('shows carbs grams', () => {
    const { getByText } = render(<NutritionCard nutrition={mockNutrition} />)
    expect(getByText('48g')).toBeTruthy()
  })

  it('shows fat grams', () => {
    const { getByText } = render(<NutritionCard nutrition={mockNutrition} />)
    expect(getByText('18g')).toBeTruthy()
  })

  it('shows Calories label', () => {
    const { getByText } = render(<NutritionCard nutrition={mockNutrition} />)
    expect(getByText('Calories')).toBeTruthy()
  })

  it('shows Protein label', () => {
    const { getByText } = render(<NutritionCard nutrition={mockNutrition} />)
    expect(getByText('Protein')).toBeTruthy()
  })
})
