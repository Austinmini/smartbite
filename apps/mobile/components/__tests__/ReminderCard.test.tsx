import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { ReminderCard } from '../ReminderCard'

const mockReminder = {
  id: 'rem-1',
  itemName: 'eggs',
  quantity: 12,
  unit: 'each',
  frequencyDays: 7,
  nextRemindAt: new Date('2026-04-10T10:00:00Z').toISOString(),
  active: true,
  source: 'manual' as const,
  reasoning: null,
}

describe('ReminderCard', () => {
  it('renders item name', () => {
    const { getByText } = render(
      <ReminderCard reminder={mockReminder} onEdit={jest.fn()} onDelete={jest.fn()} />
    )
    expect(getByText('eggs')).toBeTruthy()
  })

  it('shows quantity and unit', () => {
    const { getByText } = render(
      <ReminderCard reminder={mockReminder} onEdit={jest.fn()} onDelete={jest.fn()} />
    )
    expect(getByText('12 each')).toBeTruthy()
  })

  it('shows frequency chip', () => {
    const { getByText } = render(
      <ReminderCard reminder={mockReminder} onEdit={jest.fn()} onDelete={jest.fn()} />
    )
    expect(getByText('Every 7 days')).toBeTruthy()
  })

  it('shows next due date', () => {
    const { getByText } = render(
      <ReminderCard reminder={mockReminder} onEdit={jest.fn()} onDelete={jest.fn()} />
    )
    // Should display some date indication
    expect(getByText(/Apr 10/)).toBeTruthy()
  })

  it('calls onEdit when edit button pressed', () => {
    const onEdit = jest.fn()
    const { getByTestId } = render(
      <ReminderCard reminder={mockReminder} onEdit={onEdit} onDelete={jest.fn()} />
    )
    fireEvent.press(getByTestId('reminder-edit-rem-1'))
    expect(onEdit).toHaveBeenCalledWith(mockReminder)
  })

  it('calls onDelete when delete button pressed', () => {
    const onDelete = jest.fn()
    const { getByTestId } = render(
      <ReminderCard reminder={mockReminder} onEdit={jest.fn()} onDelete={onDelete} />
    )
    fireEvent.press(getByTestId('reminder-delete-rem-1'))
    expect(onDelete).toHaveBeenCalledWith('rem-1')
  })

  it('shows AI badge when source is ai_suggested', () => {
    const aiReminder = { ...mockReminder, source: 'ai_suggested' as const }
    const { getByText } = render(
      <ReminderCard reminder={aiReminder} onEdit={jest.fn()} onDelete={jest.fn()} />
    )
    expect(getByText('AI')).toBeTruthy()
  })

  it('does not show AI badge when source is manual', () => {
    const { queryByText } = render(
      <ReminderCard reminder={mockReminder} onEdit={jest.fn()} onDelete={jest.fn()} />
    )
    expect(queryByText('AI')).toBeNull()
  })

  it('shows inactive indicator when reminder is not active', () => {
    const inactive = { ...mockReminder, active: false }
    const { getByTestId } = render(
      <ReminderCard reminder={inactive} onEdit={jest.fn()} onDelete={jest.fn()} />
    )
    expect(getByTestId('reminder-inactive-rem-1')).toBeTruthy()
  })
})
