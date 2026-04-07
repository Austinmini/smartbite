import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { PriceTrendChart } from '../PriceTrendChart'

const mockTrendData = [
  { bucket: '2026-03-10', avgPrice: 3.49, observationCount: 5 },
  { bucket: '2026-03-17', avgPrice: 3.59, observationCount: 8 },
  { bucket: '2026-03-24', avgPrice: 3.29, observationCount: 12 },
  { bucket: '2026-03-31', avgPrice: 3.69, observationCount: 7 },
]

describe('PriceTrendChart', () => {
  it('renders the ingredient name', () => {
    const { getByText } = render(
      <PriceTrendChart ingredient="chicken breast" storeName="HEB" data={mockTrendData} days={30} onDaysChange={jest.fn()} />
    )
    expect(getByText('chicken breast')).toBeTruthy()
  })

  it('renders the store name', () => {
    const { getByText } = render(
      <PriceTrendChart ingredient="chicken breast" storeName="HEB" data={mockTrendData} days={30} onDaysChange={jest.fn()} />
    )
    expect(getByText('HEB')).toBeTruthy()
  })

  it('renders 7-day toggle button', () => {
    const { getByText } = render(
      <PriceTrendChart ingredient="eggs" storeName="Kroger" data={mockTrendData} days={30} onDaysChange={jest.fn()} />
    )
    expect(getByText('7d')).toBeTruthy()
  })

  it('renders 30-day toggle button', () => {
    const { getByText } = render(
      <PriceTrendChart ingredient="eggs" storeName="Kroger" data={mockTrendData} days={30} onDaysChange={jest.fn()} />
    )
    expect(getByText('30d')).toBeTruthy()
  })

  it('renders 90-day toggle button', () => {
    const { getByText } = render(
      <PriceTrendChart ingredient="eggs" storeName="Kroger" data={mockTrendData} days={90} onDaysChange={jest.fn()} />
    )
    expect(getByText('90d')).toBeTruthy()
  })

  it('calls onDaysChange when toggle pressed', () => {
    const onDaysChange = jest.fn()
    const { getByText } = render(
      <PriceTrendChart ingredient="eggs" storeName="Kroger" data={mockTrendData} days={30} onDaysChange={onDaysChange} />
    )
    fireEvent.press(getByText('7d'))
    expect(onDaysChange).toHaveBeenCalledWith(7)
  })

  it('renders price bars for each data point', () => {
    const { getAllByTestId } = render(
      <PriceTrendChart ingredient="eggs" storeName="Kroger" data={mockTrendData} days={30} onDaysChange={jest.fn()} />
    )
    expect(getAllByTestId(/price-bar-/).length).toBe(4)
  })

  it('shows min and max price labels', () => {
    const { getByText } = render(
      <PriceTrendChart ingredient="eggs" storeName="Kroger" data={mockTrendData} days={30} onDaysChange={jest.fn()} />
    )
    expect(getByText('$3.29')).toBeTruthy()
    expect(getByText('$3.69')).toBeTruthy()
  })

  it('renders empty state when no data', () => {
    const { getByText } = render(
      <PriceTrendChart ingredient="eggs" storeName="Kroger" data={[]} days={30} onDaysChange={jest.fn()} />
    )
    expect(getByText('No price data yet')).toBeTruthy()
  })
})
