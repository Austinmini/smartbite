import { create } from 'zustand'

interface SubscriptionState {
  isTrial: boolean
  trialEndsAt: string | null
  daysRemaining: number | null
  renewalDate: string | null
  setStatus: (status: {
    isTrial: boolean
    trialEndsAt: string | null
    daysRemaining: number | null
    renewalDate: string | null
  }) => void
}

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  isTrial: false,
  trialEndsAt: null,
  daysRemaining: null,
  renewalDate: null,
  setStatus: (status) => set(status),
}))
