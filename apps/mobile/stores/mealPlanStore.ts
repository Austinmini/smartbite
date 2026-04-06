import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export interface MealRecipe {
  id: string
  title: string
  readyInMinutes: number
  servings: number
  ingredients: { name: string; amount: number; unit: string }[]
  instructions: { step: number; text: string }[]
  nutrition: { calories: number; protein: number; carbs: number; fat: number }
  tags: string[]
  imageUrl: string | null
}

export interface PlanMeal {
  id: string
  mealPlanId: string
  dayOfWeek: number
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'
  estCost: number
  bestStore: string
  recipe: MealRecipe
}

export interface MealPlan {
  id: string
  userId: string
  weekStarting: string
  totalEstCost: number
  createdAt: string
  meals: PlanMeal[]
}

interface MealPlanState {
  plan: MealPlan | null
  isGenerating: boolean
  error: string | null
  setPlan: (plan: MealPlan) => void
  clearPlan: () => void
  setGenerating: (v: boolean) => void
  setError: (e: string | null) => void
  reset: () => void
}

export const useMealPlanStore = create<MealPlanState>()(
  persist(
    (set) => ({
      plan: null,
      isGenerating: false,
      error: null,
      setPlan: (plan) => set({ plan }),
      clearPlan: () => set({ plan: null }),
      setGenerating: (v) => set({ isGenerating: v }),
      setError: (e) => set({ error: e }),
      reset: () => set({ plan: null, isGenerating: false, error: null }),
    }),
    {
      name: 'meal-plan-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ plan: state.plan }),
    }
  )
)
