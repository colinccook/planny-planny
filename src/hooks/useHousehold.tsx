import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { HouseholdRealtimeManager } from '../lib/realtime'
import { useAuth } from './useAuth'
import type { Database } from '../types/database'
import type { Role } from '../lib/permissions'
import { pickInitialHousehold, lastHouseholdStorageKey } from '../lib/householdSelection'

type Household = Database['public']['Tables']['households']['Row']

interface MembershipWithHousehold {
  household_id: string
  role: string
  households: Household | null
}

interface HouseholdContextType {
  households: Household[]
  /** All memberships the current user has (one per household). */
  memberships: { household: Household; role: Role }[]
  currentHousehold: Household | null
  currentRole: Role | null
  switchHousehold: (householdId: string) => void
  isLoading: boolean
}

const HouseholdContext = createContext<HouseholdContextType | undefined>(undefined)

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const realtimeRef = useRef<HouseholdRealtimeManager | null>(null)
  const [currentHouseholdId, setCurrentHouseholdId] = useState<string | null>(null)

  // Initialize realtime manager
  useEffect(() => {
    realtimeRef.current = new HouseholdRealtimeManager(supabase, queryClient)
    return () => {
      realtimeRef.current?.unsubscribe()
    }
  }, [queryClient])

  // Fetch user's households via memberships
  const { data: memberships = [], isLoading: membershipsLoading } = useQuery({
    queryKey: ['my-households', user?.id],
    queryFn: async () => {
      if (!user) return []
      const { data, error } = await supabase
        .from('household_members')
        .select('household_id, role, households(*)')
        .eq('user_id', user.id)

      if (error) throw error
      return (data ?? []) as unknown as MembershipWithHousehold[]
    },
    enabled: !!user,
  })

  const households = memberships
    .map((m) => m.households)
    .filter((h): h is Household => h !== null)

  const allMemberships = memberships
    .filter((m): m is MembershipWithHousehold & { households: Household } => m.households !== null)
    .map((m) => ({ household: m.households, role: m.role as Role }))

  // Pick which household should be active. If the user has previously chosen
  // one (and they're still a member), keep using it. Otherwise fall back to
  // the first available household. The selection rule itself is a pure
  // function (`pickInitialHousehold`) so it can be reasoned about and tested
  // independently of React.
  const storedId =
    currentHouseholdId ??
    (user && typeof window !== 'undefined'
      ? window.localStorage.getItem(lastHouseholdStorageKey(user.id))
      : null)
  const currentHousehold = pickInitialHousehold(storedId, households)

  const currentMembership = memberships.find(
    (m) => m.households?.id === currentHousehold?.id
  )
  const currentRole = (currentMembership?.role as Role) ?? null

  // Auto-select first household and reconcile our internal state when the
  // stored id is no longer a valid membership (e.g. the user was removed
  // from that household between sessions). This mirrors the original
  // "auto-select first household" guard — it is idempotent so it doesn't
  // cause render loops.
  if (currentHousehold && currentHouseholdId !== currentHousehold.id) {
    setCurrentHouseholdId(currentHousehold.id)
  }

  // Persist the active household id so we can pick it up next time the
  // user logs in. Writing to localStorage is the canonical "sync external
  // system" use case for an effect.
  useEffect(() => {
    if (!currentHousehold || !user || typeof window === 'undefined') return
    window.localStorage.setItem(
      lastHouseholdStorageKey(user.id),
      currentHousehold.id,
    )
  }, [currentHousehold, user])

  // Subscribe to Realtime when household changes
  useEffect(() => {
    if (currentHousehold && realtimeRef.current) {
      if (realtimeRef.current.householdId !== currentHousehold.id) {
        realtimeRef.current.subscribe(currentHousehold.id)
      }
    }
  }, [currentHousehold])

  const switchHousehold = (householdId: string) => {
    setCurrentHouseholdId(householdId)
    if (user && typeof window !== 'undefined') {
      window.localStorage.setItem(lastHouseholdStorageKey(user.id), householdId)
    }
    realtimeRef.current?.subscribe(householdId)
  }

  return (
    <HouseholdContext.Provider
      value={{
        households,
        memberships: allMemberships,
        currentHousehold,
        currentRole,
        switchHousehold,
        isLoading: membershipsLoading,
      }}
    >
      {children}
    </HouseholdContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useHousehold(): HouseholdContextType {
  const context = useContext(HouseholdContext)
  if (context === undefined) {
    throw new Error('useHousehold must be used within a HouseholdProvider')
  }
  return context
}
