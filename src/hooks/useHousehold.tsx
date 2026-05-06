import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from './useAuth'
import { useMemberships, type MembershipView } from './useMemberships'
import { useHouseholdRealtime } from './useHouseholdRealtime'
import type { Database } from '../types/database'
import type { Role } from '../lib/permissions'
import { pickInitialHousehold, lastHouseholdStorageKey } from '../lib/householdSelection'

type Household = Database['public']['Tables']['households']['Row']

interface HouseholdContextType {
  households: Household[]
  /** All memberships the current user has (one per household). */
  memberships: MembershipView[]
  currentHousehold: Household | null
  currentRole: Role | null
  switchHousehold: (householdId: string) => void
  isLoading: boolean
}

const HouseholdContext = createContext<HouseholdContextType | undefined>(undefined)

/**
 * Compose the three single-purpose hooks into the public household API.
 * The split mirrors the recommendation in `docs/state-management.md`:
 *
 *   - `useMemberships`        — TanStack Query for the user's memberships.
 *   - `useHouseholdRealtime`  — Realtime subscription lifecycle.
 *   - This provider           — selection state (`currentHouseholdId`) +
 *                               persistence to localStorage.
 *
 * `useHousehold()` is preserved as a thin re-export so consumers don't
 * need to change. Components that only need one slice (e.g. the list of
 * memberships) can import the smaller hook directly.
 */
export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { households, memberships, isLoading } = useMemberships()
  const [currentHouseholdId, setCurrentHouseholdId] = useState<string | null>(null)

  // Pick the active household. We prefer (a) an explicit in-memory choice
  // from `switchHousehold`, then (b) the last household this user used on
  // this device, then (c) the first available membership. Selection is a
  // pure function so it can be unit-tested independently of React.
  const storedId =
    currentHouseholdId ??
    (user && typeof window !== 'undefined'
      ? window.localStorage.getItem(lastHouseholdStorageKey(user.id))
      : null)
  const currentHousehold = pickInitialHousehold(storedId, households)

  const currentMembership = memberships.find(
    (m) => m.household.id === currentHousehold?.id,
  )
  const currentRole = currentMembership?.role ?? null

  // Reconcile internal state with the resolved household — covers the
  // "stored id is no longer a valid membership" case (e.g. removed from
  // a household between sessions). Idempotent.
  if (currentHousehold && currentHouseholdId !== currentHousehold.id) {
    setCurrentHouseholdId(currentHousehold.id)
  }

  // Persist the active selection so the next session opens the same
  // household. This is the canonical "sync external system" effect.
  useEffect(() => {
    if (!currentHousehold || !user || typeof window === 'undefined') return
    window.localStorage.setItem(
      lastHouseholdStorageKey(user.id),
      currentHousehold.id,
    )
  }, [currentHousehold, user])

  // Hand the resolved household id off to the realtime hook — its only
  // job is to keep the websocket pinned to that household.
  useHouseholdRealtime(currentHousehold?.id ?? null)

  const switchHousehold = (householdId: string) => {
    setCurrentHouseholdId(householdId)
    if (user && typeof window !== 'undefined') {
      window.localStorage.setItem(lastHouseholdStorageKey(user.id), householdId)
    }
    // The realtime hook will pick up the change via the household id
    // dependency — no manual subscribe needed here any more.
  }

  return (
    <HouseholdContext.Provider
      value={{
        households,
        memberships,
        currentHousehold,
        currentRole,
        switchHousehold,
        isLoading,
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
