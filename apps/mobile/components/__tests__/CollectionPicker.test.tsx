import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { CollectionPicker } from '../CollectionPicker'
import type { RecipeCollection } from '../../stores/savedRecipesStore'

const makeCollection = (overrides: Partial<RecipeCollection> = {}): RecipeCollection => ({
  id: 'col-1',
  name: 'Weeknight Wins',
  emoji: '🍝',
  recipeIds: ['recipe-1', 'recipe-2'],
  createdAt: new Date().toISOString(),
  ...overrides,
})

describe('CollectionPicker', () => {
  it('renders nothing when not visible', () => {
    const { queryByText } = render(
      <CollectionPicker
        visible={false}
        collections={[makeCollection()]}
        onClose={jest.fn()}
        onSelectCollection={jest.fn()}
        onCreateCollection={jest.fn()}
      />
    )
    expect(queryByText('Add to collection')).toBeNull()
  })

  it('renders the sheet title when visible', () => {
    const { getByText } = render(
      <CollectionPicker
        visible
        collections={[]}
        onClose={jest.fn()}
        onSelectCollection={jest.fn()}
        onCreateCollection={jest.fn()}
      />
    )
    expect(getByText('Add to collection')).toBeTruthy()
  })

  it('renders existing collections with name and recipe count', () => {
    const { getByText } = render(
      <CollectionPicker
        visible
        collections={[makeCollection()]}
        onClose={jest.fn()}
        onSelectCollection={jest.fn()}
        onCreateCollection={jest.fn()}
      />
    )
    expect(getByText('Weeknight Wins')).toBeTruthy()
    expect(getByText('2 recipes')).toBeTruthy()
  })

  it('calls onSelectCollection with the collection id when a row is pressed', () => {
    const onSelect = jest.fn()
    const { getByText } = render(
      <CollectionPicker
        visible
        collections={[makeCollection({ id: 'col-abc' })]}
        onClose={jest.fn()}
        onSelectCollection={onSelect}
        onCreateCollection={jest.fn()}
      />
    )
    fireEvent.press(getByText('Weeknight Wins'))
    expect(onSelect).toHaveBeenCalledWith('col-abc')
  })

  it('calls onClose when Done is pressed', () => {
    const onClose = jest.fn()
    const { getByText } = render(
      <CollectionPicker
        visible
        collections={[]}
        onClose={onClose}
        onSelectCollection={jest.fn()}
        onCreateCollection={jest.fn()}
      />
    )
    fireEvent.press(getByText('Done'))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onCreateCollection with the entered name when Create is pressed', () => {
    const onCreate = jest.fn()
    const { getByPlaceholderText, getByText } = render(
      <CollectionPicker
        visible
        collections={[]}
        onClose={jest.fn()}
        onSelectCollection={jest.fn()}
        onCreateCollection={onCreate}
      />
    )
    fireEvent.changeText(getByPlaceholderText('Collection name'), 'Meal Prep')
    fireEvent.press(getByText('Create collection'))
    expect(onCreate).toHaveBeenCalledWith('Meal Prep', '❤️')
  })

  it('does not call onCreateCollection when name is empty', () => {
    const onCreate = jest.fn()
    const { getByText } = render(
      <CollectionPicker
        visible
        collections={[]}
        onClose={jest.fn()}
        onSelectCollection={jest.fn()}
        onCreateCollection={onCreate}
      />
    )
    fireEvent.press(getByText('Create collection'))
    expect(onCreate).not.toHaveBeenCalled()
  })
})
