import React from 'react'
import { render } from '@testing-library/react-native'
import { BestStoreCard } from '../BestStoreCard'

describe('BestStoreCard', () => {
  it('renders the winning store summary', () => {
    const { getByText } = render(
      <BestStoreCard
        title="Best single store"
        storeName="HEB"
        totalCost={12.4}
        distanceMiles={1.2}
        savingsLabel="Save $3.50 vs the next option"
      />
    )

    expect(getByText('Best single store')).toBeTruthy()
    expect(getByText('HEB')).toBeTruthy()
    expect(getByText('$12.40 total')).toBeTruthy()
    expect(getByText('1.2 mi away')).toBeTruthy()
    expect(getByText('Save $3.50 vs the next option')).toBeTruthy()
  })

  it('renders fallback messaging without a fake total when live prices are unavailable', () => {
    const { getByText, queryByText } = render(
      <BestStoreCard
        title="Selected stores"
        storeName="HEB"
        totalCost={0}
        distanceMiles={1.2}
        totalLabel="Live prices unavailable"
      />
    )

    expect(getByText('Selected stores')).toBeTruthy()
    expect(getByText('Live prices unavailable')).toBeTruthy()
    expect(queryByText('$0.00 total')).toBeNull()
  })
})
