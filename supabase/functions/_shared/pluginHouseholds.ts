import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { Database } from '../../../src/types/database.ts'
import { canUsePlugin } from '../../../src/lib/permissions.ts'

type Client = SupabaseClient<Database>

export class PluginHouseholdError extends Error {
  readonly code: number

  constructor(message: string, code: number) {
    super(message)
    this.code = code
  }
}

export async function listPluginHouseholds(supabase: Client, userId: string) {
  const { data: memberships, error: membershipError } = await supabase
    .from('household_members')
    .select('role, households(id, name)')
    .eq('user_id', userId)
    .order('joined_at', { ascending: true })
  if (membershipError) throw new Error(membershipError.message)

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('last_household_id')
    .eq('id', userId)
    .maybeSingle()
  if (profileError) throw new Error(profileError.message)

  const households = (memberships ?? []).flatMap(({ role, households: household }) =>
    household ? [{ ...household, role, can_use_plugin: canUsePlugin(role) }] : [],
  )
  const active = households.find((household) => household.id === profile?.last_household_id)
    ?? (households.length === 1 ? households[0] : null)

  return { households, active_household_id: active?.id ?? null }
}

export async function resolvePluginHousehold(
  supabase: Client,
  userId: string,
  requestedId: string | null = null,
) {
  const { households, active_household_id } = await listPluginHouseholds(supabase, userId)
  const householdId = requestedId ?? active_household_id
  if (!householdId) {
    throw new PluginHouseholdError('No active household. Use list_households, then switch_household to choose one.', -32002)
  }
  const household = households.find((candidate) => candidate.id === householdId)
  if (!household) throw new PluginHouseholdError('The selected household is unavailable.', -32003)
  if (!canUsePlugin(household.role)) {
    throw new PluginHouseholdError('Your household access level cannot use the ChatGPT plugin.', -32003)
  }
  return household
}

export async function switchPluginHousehold(supabase: Client, userId: string, householdId: string) {
  const household = await resolvePluginHousehold(supabase, userId, householdId)
  const { error } = await supabase
    .from('profiles')
    .update({ last_household_id: household.id })
    .eq('id', userId)
    .select('last_household_id')
    .single()
  if (error) throw new Error(error.message)
  return { household }
}
