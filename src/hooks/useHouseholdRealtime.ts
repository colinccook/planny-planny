import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { HouseholdRealtimeManager } from '../lib/realtime'

/**
 * Owns the lifecycle of a single `HouseholdRealtimeManager` for the
 * currently-active household. Mount it once near the root of the
 * authenticated app and pass in the active household id.
 *
 * Extracted from `useHousehold` so that:
 *  - membership loading and selection state can change without
 *    re-creating the realtime manager;
 *  - the realtime lifecycle has exactly one home, easy to reason about.
 *
 * The manager is created on mount and destroyed on unmount. Each time
 * `householdId` changes we re-subscribe (the manager itself tears down
 * the old channels first). Subscribing to the same household twice is a
 * no-op — see `HouseholdRealtimeManager.subscribe`.
 */
export function useHouseholdRealtime(householdId: string | null | undefined): void {
  const queryClient = useQueryClient()
  const managerRef = useRef<HouseholdRealtimeManager | null>(null)

  // Build the manager once per mount. The QueryClient itself is stable
  // (the provider lives at the root) so this effect only runs on mount
  // and unmount in practice.
  useEffect(() => {
    managerRef.current = new HouseholdRealtimeManager(supabase, queryClient)
    return () => {
      managerRef.current?.unsubscribe()
      managerRef.current = null
    }
  }, [queryClient])

  // (Re-)subscribe whenever the active household changes. When the active
  // household disappears (logout, removed from the household, deleted the
  // last household), tear the subscription down so we stop consuming
  // events for a household we no longer have a view into.
  useEffect(() => {
    const manager = managerRef.current
    if (!manager) return
    if (!householdId) {
      if (manager.householdId !== null) manager.unsubscribe()
      return
    }
    if (manager.householdId !== householdId) {
      manager.subscribe(householdId)
    }
  }, [householdId])
}
