import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from './useAuth'
import { useMemberships, type MembershipView } from './useMemberships'
import { useHouseholdRealtime } from './useHouseholdRealtime'
import { useUserPreferences } from './useUserPreferences'
import { useSounds } from './useSounds'
import type { Database } from '../types/database'
import type { Role } from '../lib/permissions'
import type { HouseholdTable } from '../lib/queryKeys'
import type { RealtimeEventType } from '../lib/realtime'
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
 *   - `useUserPreferences`    — server-side per-user settings, including
 *                               the last household the user was in. This
 *                               is what makes "remember my household"
 *                               work across devices, not just on the
 *                               device where it was last set.
 *   - This provider           — selection state (`currentHouseholdId`) +
 *                               persistence to the database (with
 *                               localStorage as a fast first-paint hint).
 *
 * `useHousehold()` is preserved as a thin re-export so consumers don't
 * need to change. Components that only need one slice (e.g. the list of
 * memberships) can import the smaller hook directly.
 */
export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { households, memberships, isLoading } = useMemberships()
  const { preferences, setPreferences } = useUserPreferences()
  const [currentHouseholdId, setCurrentHouseholdId] = useState<string | null>(null)

  // Pick the active household. Preference order is, top to bottom:
  //   1. an explicit in-memory choice from `switchHousehold`,
  //   2. the server-stored `last_household_id` for this user — this is
  //      what makes "remember my household across devices" work,
  //   3. the last household this user used on this device (localStorage)
  //      — covers the brief window before the preferences query lands,
  //      so a returning user on the same device sees the right household
  //      on first paint without waiting for a network round-trip,
  //   4. the first available membership.
  // Selection itself is a pure function so it can be unit-tested
  // independently of React.
  const localStorageId =
    user && typeof window !== 'undefined'
      ? window.localStorage.getItem(lastHouseholdStorageKey(user.id))
      : null
  const storedId =
    currentHouseholdId ?? preferences.lastHouseholdId ?? localStorageId
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
  // household. We write to localStorage on every change so the next
  // visit on this device doesn't briefly flash the wrong household
  // before the server preferences query resolves. The server-side
  // write happens *only* in `switchHousehold` (an explicit user
  // action) — otherwise on a fresh sign-in we'd race the preferences
  // query and overwrite a `last_household_id` set from another device
  // with whatever first-membership we happened to resolve while
  // loading.
  useEffect(() => {
    if (!currentHousehold || !user || typeof window === 'undefined') return
    window.localStorage.setItem(
      lastHouseholdStorageKey(user.id),
      currentHousehold.id,
    )
  }, [currentHousehold, user])

  // Hand the resolved household id off to the realtime hook — its only
  // job is to keep the websocket pinned to that household. We also wire
  // a listener that turns row-level events into subtle sound effects.
  const { play } = useSounds()
  const onRealtimeEvent = useCallback(
    (table: HouseholdTable, event: RealtimeEventType) => {
      // Map (table, event) → friendly sound. The intent is to celebrate
      // useful collaboration signals (a new meal/idea/todo, a reaction
      // landing, a task being ticked off) without making low-level
      // bookkeeping (membership churn, household metadata edits) noisy.
      if (event === 'INSERT') {
        if (table === 'reactions') return play('react')
        // NB: meal_outcomes INSERT is intentionally *not* mapped here.
        // Supabase Realtime echoes writes back to the originating
        // client, and the `useUpsertMealOutcome` mutation already
        // plays the right sound locally (`done` for as_planned,
        // `pop` for did_not_happen) — the realtime payload doesn't
        // carry the status, so we'd either double up the sound or
        // play the wrong one for misses. This mirrors the same
        // "fire from the mutation, not realtime" pattern todos use
        // for completion (see useTodos).
        if (
          table === 'meal_plans' ||
          table === 'meal_ideas' ||
          table === 'todo_items'
        ) {
          return play('pop')
        }
        return
      }
      if (event === 'UPDATE') {
        // Realtime UPDATEs don't tell us *what* changed, so we keep
        // them to the very gentle `update` blip. The warm "done" chime
        // for completing a todo is fired locally from the completion
        // mutation in `useTodos` instead, which knows the user's intent.
        // meal_outcomes UPDATE stays in the gentle-blip group: when
        // *another* device on the household changes an outcome, a
        // soft `update` is appropriate; the celebratory done/pop is
        // owned by the originating client's mutation.
        if (
          table === 'todo_items' ||
          table === 'meal_plans' ||
          table === 'meal_ideas' ||
          table === 'meal_outcomes'
        ) {
          return play('update')
        }
        return
      }
      // DELETEs intentionally stay silent — we don't want to draw
      // attention to disappearing rows.
    },
    [play],
  )
  useHouseholdRealtime(currentHousehold?.id ?? null, onRealtimeEvent)

  const switchHousehold = (householdId: string) => {
    setCurrentHouseholdId(householdId)
    if (user && typeof window !== 'undefined') {
      window.localStorage.setItem(lastHouseholdStorageKey(user.id), householdId)
    }
    setPreferences({ lastHouseholdId: householdId })
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
