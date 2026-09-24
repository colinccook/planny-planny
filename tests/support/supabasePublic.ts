import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../src/types/database'

const SUPABASE_URL =
  process.env.SUPABASE_URL ??
  process.env.VITE_SUPABASE_URL ??
  'http://127.0.0.1:54321'

const DEFAULT_LOCAL_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  'eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.' +
  'CRFA0NiK7kyqHDan_WiMe9UYAl1lhTbcECmMEaFzOFo'

const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  process.env.VITE_SUPABASE_ANON_KEY ??
  DEFAULT_LOCAL_ANON_KEY

export function createPublicTestClient() {
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}
