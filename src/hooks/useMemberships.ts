import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { queryKeys } from '../lib/queryKeys'
import { useAuth } from './useAuth'
import type { Database } from '../types/database'
import type { Role } from '../lib/permissions'

type Household = Database['public']['Tables']['households']['Row']

/**
 * Raw row shape returned by the Supabase join. Exported because the
 * realtime hook and the selection provider both consume it; nothing
 * outside this hook layer should need it directly.
 */
export interface MembershipRow {
  household_id: string
  role: string
  households: Household | null
}

/** A user-friendly view onto one of the user's memberships. */
export interface MembershipView {
  household: Household
  role: Role
}

export interface UseMembershipsResult {
  /** Every household the user can see. */
  households: Household[]
  /** Same data, paired with each household's role. */
  memberships: MembershipView[]
  /** True while the initial fetch is in flight. */
  isLoading: boolean
}

/**
 * Pure TanStack Query wrapper around the household_members → households
 * join. Returns the user's memberships and nothing else — no realtime
 * subscription, no selection state.
 *
 * This was extracted from `useHousehold` so that:
 *  - components that only need a list of households don't get re-rendered
 *    by selection or realtime changes;
 *  - tests for membership loading are decoupled from realtime/selection.
 */
export function useMemberships(): UseMembershipsResult {
  const { user } = useAuth()

  const { data: rows = [], isLoading } = useQuery({
    queryKey: queryKeys.myHouseholds(user?.id),
    queryFn: async () => {
      if (!user) return []
      const { data, error } = await supabase
        .from('household_members')
        .select('household_id, role, households(*)')
        .eq('user_id', user.id)

      if (error) throw error
      return (data ?? []) as unknown as MembershipRow[]
    },
    enabled: !!user,
  })

  const households = rows
    .map((m) => m.households)
    .filter((h): h is Household => h !== null)

  const memberships: MembershipView[] = rows
    .filter((m): m is MembershipRow & { households: Household } => m.households !== null)
    .map((m) => ({ household: m.households, role: m.role as Role }))

  return { households, memberships, isLoading }
}
