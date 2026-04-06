import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

// In-memory storage adapter — avoids the `window is not defined` crash that
// AsyncStorage causes when Metro evaluates this file in a Node.js context.
// Session persistence across app restarts is handled by Zustand (see authStore).
// On startup, _layout.tsx calls supabase.auth.setSession() with the stored tokens.
const memoryStorage = new Map<string, string>()
const memoryStorageAdapter = {
  getItem:    (key: string) => Promise.resolve(memoryStorage.get(key) ?? null),
  setItem:    (key: string, value: string) => { memoryStorage.set(key, value); return Promise.resolve() },
  removeItem: (key: string) => { memoryStorage.delete(key); return Promise.resolve() },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: memoryStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
