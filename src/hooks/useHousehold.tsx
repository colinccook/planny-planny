import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { HouseholdRealtimeManager } from '../lib/realtime'
import { useAuth } from './useAuth'
import type { Database } from '../types/database'

type Household = Database['public']['Tables']['households']['Row']
type HouseholdMember = Database['public']['Tables']['household_members']['Row']

interface MembershipWithHousehold {
  household_id: string
  role: string
  households: Household | null
}

interface HouseholdContextType {
  households: Household[]
  currentHousehold: Household | null
  currentRole: HouseholdMember['role'] | null
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

  const currentHousehold =
    households.find((h) => h.id === currentHouseholdId) ?? households[0] ?? null

  const currentMembership = memberships.find(
    (m) => m.households?.id === currentHousehold?.id
  )
  const currentRole = (currentMembership?.role as HouseholdMember['role']) ?? null

  // Auto-select first household
  if (currentHousehold && !currentHouseholdId) {
    setCurrentHouseholdId(currentHousehold.id)
  }

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
    realtimeRef.current?.subscribe(householdId)
  }

  return (
    <HouseholdContext.Provider
      value={{
        households,
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
