import React from 'react'
import { render } from '@testing-library/react-native'
import { OnboardingChecklist } from '../OnboardingChecklist'

const allIncomplete = {
  profileComplete: false,
  firstPlanGenerated: false,
  firstRecipeSaved: false,
  firstScan: false,
  firstPurchase: false,
}

const allComplete = {
  profileComplete: true,
  firstPlanGenerated: true,
  firstRecipeSaved: true,
  firstScan: true,
  firstPurchase: true,
}

describe('OnboardingChecklist', () => {
  it('renders when not all actions are complete', () => {
    const { getByTestId } = render(
      <OnboardingChecklist completedActions={allIncomplete} />
    )
    expect(getByTestId('onboarding-checklist')).toBeTruthy()
  })

  it('returns null when all actions are complete', () => {
    const { queryByTestId } = render(
      <OnboardingChecklist completedActions={allComplete} />
    )
    expect(queryByTestId('onboarding-checklist')).toBeNull()
  })

  it('shows Set up your profile as completed', () => {
    const { getByTestId } = render(
      <OnboardingChecklist completedActions={{ ...allIncomplete, profileComplete: true }} />
    )
    expect(getByTestId('checklist-item-profileComplete-done')).toBeTruthy()
  })

  it('shows Generate your first plan as incomplete', () => {
    const { getByTestId } = render(
      <OnboardingChecklist completedActions={allIncomplete} />
    )
    expect(getByTestId('checklist-item-firstPlanGenerated-pending')).toBeTruthy()
  })

  it('shows correct completion progress', () => {
    const partial = { ...allIncomplete, profileComplete: true, firstPlanGenerated: true }
    const { getByText } = render(
      <OnboardingChecklist completedActions={partial} />
    )
    expect(getByText('2 of 5 complete')).toBeTruthy()
  })

  it('renders all 5 checklist items', () => {
    const { getAllByTestId } = render(
      <OnboardingChecklist completedActions={allIncomplete} />
    )
    const items = getAllByTestId(/checklist-item-/)
    expect(items.length).toBe(5)
  })
})
