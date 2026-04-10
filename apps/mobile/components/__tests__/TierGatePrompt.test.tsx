import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { TierGatePrompt } from '../TierGatePrompt'

describe('TierGatePrompt', () => {
  it('renders nothing when visible is false', () => {
    const { queryByText } = render(
      <TierGatePrompt
        visible={false}
        feature="Price Trends"
        requiredTier="PRO"
        onUpgrade={jest.fn()}
        onClose={jest.fn()}
      />
    )
    expect(queryByText(/Upgrade/i)).toBeNull()
  })

  it('shows the feature name when visible', () => {
    const { getAllByText } = render(
      <TierGatePrompt
        visible
        feature="Price Trends"
        requiredTier="PRO"
        onUpgrade={jest.fn()}
        onClose={jest.fn()}
      />
    )
    expect(getAllByText(/Price Trends/i).length).toBeGreaterThan(0)
  })

  it('shows the required tier in the upgrade button', () => {
    const { getAllByText } = render(
      <TierGatePrompt
        visible
        feature="Price Trends"
        requiredTier="PRO"
        onUpgrade={jest.fn()}
        onClose={jest.fn()}
      />
    )
    // At least one element contains "Pro"
    const matches = getAllByText(/Pro/i)
    expect(matches.length).toBeGreaterThan(0)
  })

  it('calls onUpgrade when upgrade button is pressed', () => {
    const onUpgrade = jest.fn()
    const { getByText } = render(
      <TierGatePrompt
        visible
        feature="Price Trends"
        requiredTier="PRO"
        onUpgrade={onUpgrade}
        onClose={jest.fn()}
      />
    )
    fireEvent.press(getByText(/Upgrade/i))
    expect(onUpgrade).toHaveBeenCalled()
  })

  it('calls onClose when dismiss button is pressed', () => {
    const onClose = jest.fn()
    const { getByText } = render(
      <TierGatePrompt
        visible
        feature="Price Trends"
        requiredTier="PRO"
        onUpgrade={jest.fn()}
        onClose={onClose}
      />
    )
    fireEvent.press(getByText(/Not now/i))
    expect(onClose).toHaveBeenCalled()
  })

  it('shows post-trial framing when hasUsedTrial is true', () => {
    const { getByText } = render(
      <TierGatePrompt
        visible
        feature="Price Trends"
        requiredTier="PRO"
        onUpgrade={jest.fn()}
        onClose={jest.fn()}
        hasUsedTrial
      />
    )
    // Post-trial copy references getting Pro back
    expect(getByText(/Get Pro back/i)).toBeTruthy()
  })
})
