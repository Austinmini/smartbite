import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { AiSuggestionCard } from '../AiSuggestionCard'

describe('AiSuggestionCard', () => {
  it('renders buy recommendation', () => {
    const { getByText } = render(
      <AiSuggestionCard
        recommendation="buy"
        reasoning="Chicken breast is at a 3-week low. Good time to stock up."
        tier="PRO"
        onUpgrade={jest.fn()}
      />
    )
    expect(getByText(/Chicken breast is at a 3-week low/)).toBeTruthy()
  })

  it('shows buy badge for buy recommendation', () => {
    const { getByTestId } = render(
      <AiSuggestionCard
        recommendation="buy"
        reasoning="Buy now while prices are low."
        tier="PRO"
        onUpgrade={jest.fn()}
      />
    )
    expect(getByTestId('suggestion-badge-buy')).toBeTruthy()
  })

  it('shows hold badge for hold recommendation', () => {
    const { getByTestId } = render(
      <AiSuggestionCard
        recommendation="hold"
        reasoning="Prices are stable."
        tier="PRO"
        onUpgrade={jest.fn()}
      />
    )
    expect(getByTestId('suggestion-badge-hold')).toBeTruthy()
  })

  it('shows substitute badge for substitute recommendation', () => {
    const { getByTestId } = render(
      <AiSuggestionCard
        recommendation="substitute"
        reasoning="Consider chicken thighs instead — 30% cheaper right now."
        tier="PRO"
        onUpgrade={jest.fn()}
      />
    )
    expect(getByTestId('suggestion-badge-substitute')).toBeTruthy()
  })

  it('shows upgrade prompt for free tier', () => {
    const { getByText } = render(
      <AiSuggestionCard
        recommendation={null}
        reasoning={null}
        tier="FREE"
        onUpgrade={jest.fn()}
      />
    )
    expect(getByText(/Upgrade to Pro/i)).toBeTruthy()
  })

  it('calls onUpgrade when upgrade prompt pressed', () => {
    const onUpgrade = jest.fn()
    const { getByTestId } = render(
      <AiSuggestionCard
        recommendation={null}
        reasoning={null}
        tier="FREE"
        onUpgrade={onUpgrade}
      />
    )
    fireEvent.press(getByTestId('ai-suggestion-upgrade-btn'))
    expect(onUpgrade).toHaveBeenCalled()
  })

  it('does not show upgrade prompt for PRO tier', () => {
    const { queryByTestId } = render(
      <AiSuggestionCard
        recommendation="buy"
        reasoning="Buy now."
        tier="PRO"
        onUpgrade={jest.fn()}
      />
    )
    expect(queryByTestId('ai-suggestion-upgrade-btn')).toBeNull()
  })

  it('shows loading state when recommendation is loading', () => {
    const { getByTestId } = render(
      <AiSuggestionCard
        recommendation={null}
        reasoning={null}
        tier="PRO"
        loading={true}
        onUpgrade={jest.fn()}
      />
    )
    expect(getByTestId('ai-suggestion-loading')).toBeTruthy()
  })
})
