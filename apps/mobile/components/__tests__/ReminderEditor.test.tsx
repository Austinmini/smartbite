import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { ReminderEditor } from '../ReminderEditor'

describe('ReminderEditor', () => {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    onSave: jest.fn(),
    reminder: null,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders in create mode when no reminder provided', () => {
    const { getByText } = render(<ReminderEditor {...defaultProps} />)
    expect(getByText('Add a reminder')).toBeTruthy()
  })

  it('renders in edit mode when reminder is provided', () => {
    const reminder = {
      id: 'rem-1',
      itemName: 'milk',
      quantity: 1,
      unit: 'gallon',
      frequencyDays: 4,
      nextRemindAt: new Date().toISOString(),
      active: true,
      source: 'manual' as const,
      reasoning: null,
    }
    const { getByText } = render(<ReminderEditor {...defaultProps} reminder={reminder} />)
    expect(getByText('Edit reminder')).toBeTruthy()
  })

  it('pre-fills item name when editing', () => {
    const reminder = {
      id: 'rem-1',
      itemName: 'olive oil',
      quantity: 1,
      unit: 'bottle',
      frequencyDays: 14,
      nextRemindAt: new Date().toISOString(),
      active: true,
      source: 'manual' as const,
      reasoning: null,
    }
    const { getByTestId } = render(<ReminderEditor {...defaultProps} reminder={reminder} />)
    expect(getByTestId('reminder-name-input').props.value).toBe('olive oil')
  })

  it('calls onSave with correct data on submit', () => {
    const { getByTestId } = render(<ReminderEditor {...defaultProps} />)
    fireEvent.changeText(getByTestId('reminder-name-input'), 'eggs')
    fireEvent.changeText(getByTestId('reminder-quantity-input'), '12')
    fireEvent.changeText(getByTestId('reminder-unit-input'), 'each')
    fireEvent.press(getByTestId('reminder-save-btn'))
    expect(defaultProps.onSave).toHaveBeenCalledWith(
      expect.objectContaining({ itemName: 'eggs', quantity: 12, unit: 'each' })
    )
  })

  it('does not call onSave when item name is empty', () => {
    const { getByTestId } = render(<ReminderEditor {...defaultProps} />)
    fireEvent.press(getByTestId('reminder-save-btn'))
    expect(defaultProps.onSave).not.toHaveBeenCalled()
  })

  it('calls onClose when cancel is pressed', () => {
    const { getByTestId } = render(<ReminderEditor {...defaultProps} />)
    fireEvent.press(getByTestId('reminder-cancel-btn'))
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('shows frequency selector with preset options', () => {
    const { getByText } = render(<ReminderEditor {...defaultProps} />)
    expect(getByText('Daily')).toBeTruthy()
    expect(getByText('Every 3 days')).toBeTruthy()
    expect(getByText('Weekly')).toBeTruthy()
  })

  it('is not rendered when visible is false', () => {
    const { queryByTestId } = render(<ReminderEditor {...defaultProps} visible={false} />)
    expect(queryByTestId('reminder-name-input')).toBeNull()
  })
})
