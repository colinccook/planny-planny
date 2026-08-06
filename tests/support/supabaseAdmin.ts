import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../src/types/database'

/**
 * Admin Supabase client for integration tests.
 *
 * Uses the service-role JWT, which bypasses RLS — only ever instantiated
 * from inside `tests/`. Production code MUST stay on the anon key.
 *
 * The URL and key are read from env, falling back to the well-known
 * Supabase CLI local-dev values so a fresh `supabase start` "just
 * works" without anyone exporting anything. These keys are intentionally
 * public (Supabase ships them in the CLI source) — they only ever match
 * a local Postgres on 127.0.0.1, never a real project.
 */
const SUPABASE_URL =
  process.env.SUPABASE_URL ??
  process.env.VITE_SUPABASE_URL ??
  'http://127.0.0.1:54321'

// The matching service_role JWT for the well-known local-dev anon key.
// See: https://supabase.com/docs/guides/cli/local-development
const DEFAULT_LOCAL_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  'eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.' +
  'EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? DEFAULT_LOCAL_SERVICE_ROLE_KEY

if (process.env.DEBUG_SUPABASE_KEY === 'true' && SERVICE_ROLE_KEY) {
  const parts = SERVICE_ROLE_KEY.split('.')
  const payload =
    parts.length === 3
      ? (JSON.parse(globalThis.atob(parts[1])) as { role?: string })
      : null
  console.error(
    `[supabaseAdmin] key length=${SERVICE_ROLE_KEY.length} role=${payload?.role ?? 'invalid JWT'}`,
  )
}

let cached: SupabaseClient<Database> | null = null

/**
 * Get the singleton admin client. Lazily constructed so importing this
 * module in a non-Supabase context (e.g. a unit test) doesn't blow up.
 */
export function getAdminClient(): SupabaseClient<Database> {
  if (cached) return cached
  cached = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      // No session persistence — every test starts fresh.
      persistSession: false,
      autoRefreshToken: false,
    },
  })
  return cached
}
