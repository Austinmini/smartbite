import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export interface StoreItem {
  id: string
  name: string
  chain: string
  distanceMiles: number
  address: string
  lat: number
  lng: number
}

interface ProfileState {
  onboardingComplete: boolean
  weeklyBudget: number
  location: { zip?: string; lat?: number; lng?: number; city?: string } | null
  preferredRetailers: string[]   // max 2, V1 chain keys
  nearbyStores: StoreItem[]      // loaded from API during onboarding
  dietaryGoals: string[]
  allergies: string[]
  cuisinePrefs: string[]
  cookingTimeMax: number
  servings: number

  setOnboardingComplete: (v: boolean) => void
  setWeeklyBudget: (budget: number) => void
  setLocation: (loc: ProfileState['location']) => void
  setNearbyStores: (stores: StoreItem[]) => void
  toggleRetailer: (chain: string) => void
  setDietaryGoals: (goals: string[]) => void
  setAllergies: (a: string[]) => void
  setCuisinePrefs: (prefs: string[]) => void
  setCookingTimeMax: (mins: number) => void
  setServings: (n: number) => void
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      onboardingComplete: false,
      weeklyBudget: 100,
      location: null,
      preferredRetailers: [],
      nearbyStores: [],
      dietaryGoals: [],
      allergies: [],
      cuisinePrefs: [],
      cookingTimeMax: 60,
      servings: 2,

      setOnboardingComplete: (v) => set({ onboardingComplete: v }),
      setWeeklyBudget: (budget) => set({ weeklyBudget: budget }),
      setLocation: (loc) => set({ location: loc }),
      setNearbyStores: (stores) => set({ nearbyStores: stores }),
      toggleRetailer: (chain) => {
        const current = get().preferredRetailers
        if (current.includes(chain)) {
          set({ preferredRetailers: current.filter((r) => r !== chain) })
        } else if (current.length < 2) {
          set({ preferredRetailers: [...current, chain] })
        }
      },
      setDietaryGoals: (goals) => set({ dietaryGoals: goals }),
      setAllergies: (a) => set({ allergies: a }),
      setCuisinePrefs: (prefs) => set({ cuisinePrefs: prefs }),
      setCookingTimeMax: (mins) => set({ cookingTimeMax: mins }),
      setServings: (n) => set({ servings: n }),
    }),
    {
      name: 'profile-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        onboardingComplete: state.onboardingComplete,
        weeklyBudget: state.weeklyBudget,
        location: state.location,
        preferredRetailers: state.preferredRetailers,
        dietaryGoals: state.dietaryGoals,
        allergies: state.allergies,
        cuisinePrefs: state.cuisinePrefs,
        cookingTimeMax: state.cookingTimeMax,
        servings: state.servings,
      }),
    }
  )
)
