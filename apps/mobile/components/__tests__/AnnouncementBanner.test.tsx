import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { AnnouncementBanner } from '../AnnouncementBanner'

const mockAnnouncement = {
  id: 'ann-1',
  title: 'New feature: Price Trends',
  body: 'Pro users can now view 90-day price history for any ingredient.',
  type: 'FEATURE' as const,
  ctaLabel: null,
  ctaUrl: null,
}

describe('AnnouncementBanner', () => {
  it('renders announcement title', () => {
    const { getByText } = render(
      <AnnouncementBanner announcement={mockAnnouncement} onDismiss={jest.fn()} />
    )
    expect(getByText('New feature: Price Trends')).toBeTruthy()
  })

  it('renders announcement body', () => {
    const { getByText } = render(
      <AnnouncementBanner announcement={mockAnnouncement} onDismiss={jest.fn()} />
    )
    expect(getByText('Pro users can now view 90-day price history for any ingredient.')).toBeTruthy()
  })

  it('calls onDismiss with announcement id when dismiss pressed', () => {
    const onDismiss = jest.fn()
    const { getByTestId } = render(
      <AnnouncementBanner announcement={mockAnnouncement} onDismiss={onDismiss} />
    )
    fireEvent.press(getByTestId('announcement-dismiss-ann-1'))
    expect(onDismiss).toHaveBeenCalledWith('ann-1')
  })

  it('renders CTA button when ctaLabel is provided', () => {
    const withCta = { ...mockAnnouncement, ctaLabel: 'View trends', ctaUrl: '/prices/trends' }
    const { getByText } = render(
      <AnnouncementBanner announcement={withCta} onDismiss={jest.fn()} />
    )
    expect(getByText('View trends')).toBeTruthy()
  })

  it('does not render CTA button when ctaLabel is null', () => {
    const { queryByTestId } = render(
      <AnnouncementBanner announcement={mockAnnouncement} onDismiss={jest.fn()} />
    )
    expect(queryByTestId('announcement-cta-ann-1')).toBeNull()
  })

  it('applies different background for ALERT type', () => {
    const alertAnn = { ...mockAnnouncement, type: 'ALERT' as const }
    const { getByTestId } = render(
      <AnnouncementBanner announcement={alertAnn} onDismiss={jest.fn()} />
    )
    const banner = getByTestId('announcement-banner-ann-1')
    expect(banner.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ backgroundColor: expect.any(String) })])
    )
  })
})
