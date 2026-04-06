import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { PriceCompareBar } from '../PriceCompareBar'

const storeResults = [
  { storeId: 'heb', storeName: 'HEB', totalCost: 12.4, distanceMiles: 1.2, items: [] },
  { storeId: 'kroger', storeName: 'Kroger', totalCost: 13.1, distanceMiles: 2.4, items: [] },
]

describe('PriceCompareBar', () => {
  it('renders all store options with totals', () => {
    const { getByText } = render(
      <PriceCompareBar storeResults={storeResults} selectedStoreId="heb" onSelectStore={() => {}} />
    )

    expect(getByText('HEB')).toBeTruthy()
    expect(getByText('$12.40')).toBeTruthy()
    expect(getByText('Kroger')).toBeTruthy()
  })

  it('calls onSelectStore when a store chip is pressed', () => {
    const onSelectStore = jest.fn()
    const { getByTestId } = render(
      <PriceCompareBar
        storeResults={storeResults}
        selectedStoreId="heb"
        onSelectStore={onSelectStore}
      />
    )

    fireEvent.press(getByTestId('price-compare-store-kroger'))
    expect(onSelectStore).toHaveBeenCalledWith('kroger')
  })

  it('shows an unavailable label instead of a zero-dollar total when a store has no live prices', () => {
    const { getByText, queryByText } = render(
      <PriceCompareBar
        storeResults={[
          { storeId: 'heb', storeName: 'HEB', totalCost: 0, distanceMiles: 1.2, hasLivePrices: false },
        ]}
        selectedStoreId="heb"
        onSelectStore={() => {}}
      />
    )

    expect(getByText('No live prices')).toBeTruthy()
    expect(queryByText('$0.00')).toBeNull()
  })
})
