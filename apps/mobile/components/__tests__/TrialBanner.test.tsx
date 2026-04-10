import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { TrialBanner } from '../TrialBanner'

describe('TrialBanner', () => {
  it('renders nothing when not in trial', () => {
    const { queryByText } = render(
      <TrialBanner isTrial={false} daysRemaining={null} onPress={jest.fn()} />
    )
    expect(queryByText(/Trial/i)).toBeNull()
  })

  it('shows days remaining during trial', () => {
    const { getByText } = render(
      <TrialBanner isTrial daysRemaining={3} onPress={jest.fn()} />
    )
    expect(getByText(/3 days/i)).toBeTruthy()
  })

  it('shows last day copy when daysRemaining is 0', () => {
    const { getByText } = render(
      <TrialBanner isTrial daysRemaining={0} onPress={jest.fn()} />
    )
    expect(getByText(/last day/i)).toBeTruthy()
  })

  it('calls onPress when tapped', () => {
    const onPress = jest.fn()
    const { getByText } = render(
      <TrialBanner isTrial daysRemaining={2} onPress={onPress} />
    )
    fireEvent.press(getByText(/2 days/i))
    expect(onPress).toHaveBeenCalled()
  })
})
