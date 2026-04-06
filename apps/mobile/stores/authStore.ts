import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface AuthUser {
  id: string
  email: string
  tier: 'FREE' | 'PLUS' | 'PRO'
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  refreshToken: string | null
  _hasHydrated: boolean
  setUser: (user: AuthUser, token: string, refreshToken: string) => void
  clearUser: () => void
  setHasHydrated: (v: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      _hasHydrated: false,
      setUser: (user, token, refreshToken) => set({ user, token, refreshToken }),
      clearUser: () => set({ user: null, token: null, refreshToken: null }),
      setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ user: state.user, token: state.token, refreshToken: state.refreshToken }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)
