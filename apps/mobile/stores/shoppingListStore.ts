import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface ShoppingListState {
  checkedByPlan: Record<string, string[]>
  toggleItem: (planId: string, itemKey: string) => void
  isChecked: (planId: string, itemKey: string) => boolean
  getCheckedCount: (planId: string) => number
}

export const useShoppingListStore = create<ShoppingListState>()(
  persist(
    (set, get) => ({
      checkedByPlan: {},
      toggleItem: (planId, itemKey) =>
        set((state) => {
          const current = new Set(state.checkedByPlan[planId] ?? [])
          if (current.has(itemKey)) {
            current.delete(itemKey)
          } else {
            current.add(itemKey)
          }

          return {
            checkedByPlan: {
              ...state.checkedByPlan,
              [planId]: [...current],
            },
          }
        }),
      isChecked: (planId, itemKey) => (get().checkedByPlan[planId] ?? []).includes(itemKey),
      getCheckedCount: (planId) => (get().checkedByPlan[planId] ?? []).length,
    }),
    {
      name: 'shopping-list-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ checkedByPlan: state.checkedByPlan }),
    }
  )
)
