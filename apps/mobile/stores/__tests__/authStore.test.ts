jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}))

import { useAuthStore } from '../authStore'

beforeEach(() => {
  useAuthStore.setState({ user: null, token: null, refreshToken: null, _hasHydrated: false })
})

describe('authStore', () => {
  it('sets the current user, token, and refresh token', () => {
    useAuthStore.getState().setUser(
      { id: 'user-1', email: 'test@example.com', tier: 'PLUS' },
      'token-123',
      'refresh-456'
    )

    expect(useAuthStore.getState().user?.tier).toBe('PLUS')
    expect(useAuthStore.getState().token).toBe('token-123')
    expect(useAuthStore.getState().refreshToken).toBe('refresh-456')
  })

  it('clears the current user and tokens', () => {
    useAuthStore.getState().setUser(
      { id: 'user-1', email: 'test@example.com', tier: 'FREE' },
      'token-123',
      'refresh-456'
    )
    useAuthStore.getState().clearUser()

    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().token).toBeNull()
    expect(useAuthStore.getState().refreshToken).toBeNull()
  })
})
