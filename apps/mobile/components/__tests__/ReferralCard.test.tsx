import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { ReferralCard } from '../ReferralCard'

describe('ReferralCard', () => {
  it('renders the referral code and stats', () => {
    const { getByText } = render(
      <ReferralCard code="SMART6" invited={4} converted={2} onShare={jest.fn()} />
    )

    expect(getByText('SMART6')).toBeTruthy()
    expect(getByText('4 invited')).toBeTruthy()
    expect(getByText('2 converted')).toBeTruthy()
  })

  it('calls onShare when share is pressed', () => {
    const onShare = jest.fn()
    const { getByTestId } = render(
      <ReferralCard code="SMART6" invited={4} converted={2} onShare={onShare} />
    )

    fireEvent.press(getByTestId('referral-share-btn'))
    expect(onShare).toHaveBeenCalled()
  })
})
