import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { SavedRecipeEditor } from '../SavedRecipeEditor'
import type { SavedFavourite } from '../../stores/savedRecipesStore'

const makeFavourite = (overrides: Partial<SavedFavourite> = {}): SavedFavourite => ({
  recipeId: 'recipe-1',
  recipe: {
    id: 'recipe-1',
    title: 'Pesto Pasta',
    readyInMinutes: 20,
    servings: 2,
    ingredients: [],
    instructions: [],
    nutrition: { calories: 400, protein: 12, carbs: 55, fat: 14 },
    tags: [],
    cuisineType: [],
    diets: [],
  },
  savedAt: new Date().toISOString(),
  timesCooked: 3,
  userRating: 4,
  notes: 'Really good with extra garlic',
  collectionIds: [],
  ...overrides,
})

describe('SavedRecipeEditor', () => {
  it('renders nothing when not visible', () => {
    const { queryByText } = render(
      <SavedRecipeEditor
        visible={false}
        favourite={makeFavourite()}
        onClose={jest.fn()}
        onSave={jest.fn()}
      />
    )
    expect(queryByText('Pesto Pasta')).toBeNull()
  })

  it('renders nothing when favourite is null', () => {
    const { queryByText } = render(
      <SavedRecipeEditor
        visible
        favourite={null}
        onClose={jest.fn()}
        onSave={jest.fn()}
      />
    )
    expect(queryByText('Save notes')).toBeNull()
  })

  it('shows the recipe title', () => {
    const { getByText } = render(
      <SavedRecipeEditor
        visible
        favourite={makeFavourite()}
        onClose={jest.fn()}
        onSave={jest.fn()}
      />
    )
    expect(getByText('Pesto Pasta')).toBeTruthy()
  })

  it('pre-fills existing notes from the favourite', () => {
    const { getByDisplayValue } = render(
      <SavedRecipeEditor
        visible
        favourite={makeFavourite({ notes: 'Really good with extra garlic' })}
        onClose={jest.fn()}
        onSave={jest.fn()}
      />
    )
    expect(getByDisplayValue('Really good with extra garlic')).toBeTruthy()
  })

  it('calls onSave with updated notes when Save notes is pressed', () => {
    const onSave = jest.fn()
    const { getByDisplayValue, getByText } = render(
      <SavedRecipeEditor
        visible
        favourite={makeFavourite({ notes: 'Old note' })}
        onClose={jest.fn()}
        onSave={onSave}
      />
    )
    fireEvent.changeText(getByDisplayValue('Old note'), 'New note')
    fireEvent.press(getByText('Save notes'))
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ notes: 'New note' })
    )
  })

  it('calls onSave with the selected rating', () => {
    const onSave = jest.fn()
    const { getAllByText, getByText } = render(
      <SavedRecipeEditor
        visible
        favourite={makeFavourite({ userRating: null })}
        onClose={jest.fn()}
        onSave={onSave}
      />
    )
    // Stars are rendered as '★' characters — tap the 3rd one
    const stars = getAllByText('★')
    fireEvent.press(stars[2])
    fireEvent.press(getByText('Save notes'))
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ userRating: 3 })
    )
  })

  it('calls onClose when Cancel is pressed', () => {
    const onClose = jest.fn()
    const { getByText } = render(
      <SavedRecipeEditor
        visible
        favourite={makeFavourite()}
        onClose={onClose}
        onSave={jest.fn()}
      />
    )
    fireEvent.press(getByText('Cancel'))
    expect(onClose).toHaveBeenCalled()
  })
})
