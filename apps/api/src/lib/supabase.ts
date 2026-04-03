import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL ?? ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY ?? ''

// Service client — used server-side only, never exposed to the client
export const supabaseServiceClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})
