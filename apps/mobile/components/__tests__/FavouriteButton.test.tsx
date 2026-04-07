import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { FavouriteButton } from '../FavouriteButton'

describe('FavouriteButton', () => {
  it('renders unsaved state', () => {
    const { getByText } = render(<FavouriteButton isSaved={false} onPress={jest.fn()} />)
    expect(getByText('Save')).toBeTruthy()
  })

  it('renders saved state', () => {
    const { getByText } = render(<FavouriteButton isSaved onPress={jest.fn()} />)
    expect(getByText('Saved')).toBeTruthy()
  })

  it('calls onPress when tapped', () => {
    const onPress = jest.fn()
    const { getByTestId } = render(<FavouriteButton isSaved={false} onPress={onPress} />)
    fireEvent.press(getByTestId('favourite-button'))
    expect(onPress).toHaveBeenCalled()
  })
})
