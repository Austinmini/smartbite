// Supabase mock — prevents any real network calls in tests

jest.mock('../../lib/supabase', () => ({
  supabaseServiceClient: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn(),
    },
  },
}))

import { supabaseServiceClient } from '../../lib/supabase'
export const supabaseMock = supabaseServiceClient as jest.Mocked<typeof supabaseServiceClient>
