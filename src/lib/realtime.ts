import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js'
import type { QueryClient } from '@tanstack/react-query'
import type { Database } from '../types/database'
import {
  HOUSEHOLD_FILTERED_TABLES,
  invalidateAfter,
  type HouseholdTable,
} from './queryKeys'

/** Postgres operation type as reported by Supabase Realtime payloads. */
export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE'

/** Callback fired for every realtime payload routed through the manager. */
export type RealtimeEventListener = (
  table: HouseholdTable,
  event: RealtimeEventType,
) => void

/**
 * Manages Supabase Realtime subscriptions scoped to a single household.
 * When the user switches households, the old channels are torn down
 * and new ones are created for the active household.
 *
 * The mapping from "table that changed" to "query keys that need
 * invalidating" lives in `src/lib/queryKeys.ts` (`invalidateAfter`),
 * not here. That keeps the dependency graph in one place so a new
 * derived query only needs to be added once.
 */
export class HouseholdRealtimeManager {
  private channels: RealtimeChannel[] = []
  private client: SupabaseClient<Database>
  private queryClient: QueryClient
  private currentHouseholdId: string | null = null
  private listener: RealtimeEventListener | null = null

  constructor(client: SupabaseClient<Database>, queryClient: QueryClient) {
    this.client = client
    this.queryClient = queryClient
  }

  /**
   * Register (or replace) a callback that fires for every realtime row
   * change routed through this manager. Used to drive subtle sound
   * effects in sync with incoming events. Pass `null` to clear.
   */
  setEventListener(listener: RealtimeEventListener | null): void {
    this.listener = listener
  }

  private emit(table: HouseholdTable, event: string | undefined): void {
    if (!this.listener) return
    if (event !== 'INSERT' && event !== 'UPDATE' && event !== 'DELETE') return
    try {
      this.listener(table, event)
    } catch {
      // Listener errors must never break realtime invalidation.
    }
  }

  subscribe(householdId: string): void {
    this.unsubscribe()
    this.currentHouseholdId = householdId

    // Tables that have a direct household_id column — we can filter the
    // realtime stream server-side so each tab only receives changes for
    // households the user actually has open.
    for (const table of HOUSEHOLD_FILTERED_TABLES) {
      const channel = this.client
        .channel(`${table}-${householdId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table,
            filter: `household_id=eq.${householdId}`,
          },
          (payload: { eventType?: string }) => {
            invalidateAfter(this.queryClient, table, householdId)
            this.emit(table, payload?.eventType)
          },
        )
        .subscribe()

      this.channels.push(channel)
    }

    // Households table — UPDATE only, filtered by primary key. Inserts
    // and deletes are handled via the household_members channel above
    // (you can't see a household you're not a member of anyway).
    const householdChannel = this.client
      .channel(`households-${householdId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'households',
          filter: `id=eq.${householdId}`,
        },
        (payload: { eventType?: string }) => {
          invalidateAfter(this.queryClient, 'households', householdId)
          this.emit('households', payload?.eventType)
        },
      )
      .subscribe()

    this.channels.push(householdChannel)

    // meal_plan_ingredients has no household_id column — Realtime can't
    // filter it server-side, so we subscribe to all changes. The
    // invalidation graph still narrows the cache writes to this household.
    const mpiChannel = this.client
      .channel(`meal-plan-ingredients-${householdId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meal_plan_ingredients',
        },
        (payload: { eventType?: string }) => {
          invalidateAfter(this.queryClient, 'meal_plan_ingredients', householdId)
          this.emit('meal_plan_ingredients', payload?.eventType)
        },
      )
      .subscribe()

    this.channels.push(mpiChannel)
  }

  unsubscribe(): void {
    for (const channel of this.channels) {
      this.client.removeChannel(channel)
    }
    this.channels = []
    this.currentHouseholdId = null
  }

  get householdId(): string | null {
    return this.currentHouseholdId
  }
}

// Re-exported for tests that previously asserted against the channel list.
export type { HouseholdTable }
