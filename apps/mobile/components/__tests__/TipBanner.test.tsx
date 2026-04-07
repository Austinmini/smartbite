import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { TipBanner } from '../TipBanner'

describe('TipBanner', () => {
  it('renders tip text', () => {
    const { getByText } = render(
      <TipBanner tipId="tip-scan" text="Scan a barcode to report prices and earn Bites." onDismiss={jest.fn()} />
    )
    expect(getByText('Scan a barcode to report prices and earn Bites.')).toBeTruthy()
  })

  it('calls onDismiss with tipId when dismiss pressed', () => {
    const onDismiss = jest.fn()
    const { getByTestId } = render(
      <TipBanner tipId="tip-scan" text="Scan a barcode to report prices and earn Bites." onDismiss={onDismiss} />
    )
    fireEvent.press(getByTestId('tip-dismiss-tip-scan'))
    expect(onDismiss).toHaveBeenCalledWith('tip-scan')
  })

  it('renders a lightbulb or tip icon', () => {
    const { getByTestId } = render(
      <TipBanner tipId="tip-1" text="Some tip" onDismiss={jest.fn()} />
    )
    expect(getByTestId('tip-icon')).toBeTruthy()
  })
})
