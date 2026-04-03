import { create } from 'zustand'

interface AuthUser {
  id: string
  email: string
  tier: 'FREE' | 'PLUS' | 'PRO'
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  setUser: (user: AuthUser, token: string) => void
  clearUser: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  setUser: (user, token) => set({ user, token }),
  clearUser: () => set({ user: null, token: null }),
}))
