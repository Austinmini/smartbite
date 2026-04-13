jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}))

import { useProfileStore } from '../profileStore'

beforeEach(() => {
  useProfileStore.setState({
    onboardingComplete: false,
    weeklyBudget: 100,
    location: null,
    preferredRetailers: [],
    selectedStores: [],
    nearbyStores: [],
    dietaryGoals: [],
    allergies: [],
    cuisinePrefs: [],
    cookingTimeMax: 60,
    servings: 2,
  })
})

describe('profileStore', () => {
  it('toggles retailers on and off', () => {
    useProfileStore.getState().toggleRetailer('heb')
    expect(useProfileStore.getState().preferredRetailers).toEqual(['heb'])

    useProfileStore.getState().toggleRetailer('heb')
    expect(useProfileStore.getState().preferredRetailers).toEqual([])
  })

  it('caps retailer selection at two stores', () => {
    useProfileStore.getState().toggleRetailer('heb')
    useProfileStore.getState().toggleRetailer('walmart')
    useProfileStore.getState().toggleRetailer('kroger')

    expect(useProfileStore.getState().preferredRetailers).toEqual(['heb', 'walmart'])
  })

  it('updates onboarding state and budget', () => {
    useProfileStore.getState().setOnboardingComplete(true)
    useProfileStore.getState().setWeeklyBudget(140)

    expect(useProfileStore.getState().onboardingComplete).toBe(true)
    expect(useProfileStore.getState().weeklyBudget).toBe(140)
  })

  it('sets preferred retailers directly and caps at two', () => {
    useProfileStore.getState().setPreferredRetailers(['heb', 'walmart', 'kroger'])
    expect(useProfileStore.getState().preferredRetailers).toEqual(['heb', 'walmart'])
  })

  it('toggles specific nearby stores and derives preferred retailers from them', () => {
    const hebStore = {
      id: 'store-heb-1',
      name: 'HEB South Congress',
      chain: 'heb',
      distanceMiles: 0.8,
      address: '123 S Congress Ave',
      lat: 30.25,
      lng: -97.75,
    }
    const walmartStore = {
      id: 'store-walmart-1',
      name: 'Walmart Supercenter',
      chain: 'walmart',
      distanceMiles: 1.5,
      address: '456 Ben White Blvd',
      lat: 30.23,
      lng: -97.78,
    }

    useProfileStore.getState().toggleStore(hebStore)
    useProfileStore.getState().toggleStore(walmartStore)

    expect(useProfileStore.getState().selectedStores).toEqual([hebStore, walmartStore])
    expect(useProfileStore.getState().preferredRetailers).toEqual(['heb', 'walmart'])

    useProfileStore.getState().toggleStore(hebStore)
    expect(useProfileStore.getState().selectedStores).toEqual([walmartStore])
    expect(useProfileStore.getState().preferredRetailers).toEqual(['walmart'])
  })
})
