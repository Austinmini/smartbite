import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { FeedbackSheet } from '../FeedbackSheet'

describe('FeedbackSheet', () => {
  const baseProps = {
    visible: true,
    onClose: jest.fn(),
    onSubmit: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the four feedback types', () => {
    const { getByText } = render(<FeedbackSheet {...baseProps} />)
    expect(getByText('Bug')).toBeTruthy()
    expect(getByText('Feature request')).toBeTruthy()
    expect(getByText('Price issue')).toBeTruthy()
    expect(getByText('General')).toBeTruthy()
  })

  it('prefills the selected type and body', () => {
    const { getByTestId } = render(
      <FeedbackSheet
        {...baseProps}
        initialType="PRICE_ISSUE"
        initialBody="Wrong price on oat milk."
      />
    )

    expect(getByTestId('feedback-body-input').props.value).toBe('Wrong price on oat milk.')
    expect(getByTestId('feedback-type-PRICE_ISSUE').props.accessibilityState.selected).toBe(true)
  })

  it('submits the selected feedback payload', () => {
    const { getByTestId } = render(<FeedbackSheet {...baseProps} />)

    fireEvent.press(getByTestId('feedback-type-FEATURE_REQUEST'))
    fireEvent.changeText(getByTestId('feedback-subject-input'), 'Add family mode')
    fireEvent.changeText(getByTestId('feedback-body-input'), 'Would love collaborative grocery lists.')
    fireEvent.press(getByTestId('feedback-submit-btn'))

    expect(baseProps.onSubmit).toHaveBeenCalledWith({
      type: 'FEATURE_REQUEST',
      subject: 'Add family mode',
      body: 'Would love collaborative grocery lists.',
    })
  })
})
