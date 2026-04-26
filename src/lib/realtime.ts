import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js'
import type { QueryClient } from '@tanstack/react-query'
import type { Database } from '../types/database'

interface TableSubscription {
  readonly table: string
  readonly queryKey: string
}

const HOUSEHOLD_TABLES: readonly TableSubscription[] = [
  { table: 'meal_plans', queryKey: 'meal-plans' },
  { table: 'meal_ideas', queryKey: 'meal-ideas' },
  { table: 'todo_items', queryKey: 'todo-items' },
  { table: 'reactions', queryKey: 'reactions' },
  { table: 'day_contexts', queryKey: 'day-contexts' },
  { table: 'ingredients', queryKey: 'ingredients' },
  { table: 'day_placeholders', queryKey: 'day-placeholders' },
  { table: 'household_members', queryKey: 'household-members' },
] as const

/**
 * Manages Supabase Realtime subscriptions scoped to a single household.
 * When the user switches households, the old channels are torn down
 * and new ones are created for the active household.
 */
export class HouseholdRealtimeManager {
  private channels: RealtimeChannel[] = []
  private client: SupabaseClient<Database>
  private queryClient: QueryClient
  private currentHouseholdId: string | null = null

  constructor(client: SupabaseClient<Database>, queryClient: QueryClient) {
    this.client = client
    this.queryClient = queryClient
  }

  subscribe(householdId: string): void {
    this.unsubscribe()
    this.currentHouseholdId = householdId

    // Tables that have a direct household_id column
    for (const { table, queryKey } of HOUSEHOLD_TABLES) {
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
          () => {
            this.queryClient.invalidateQueries({ queryKey: [queryKey, householdId] })
            // Keep plan-streak in sync when meal_plans change via realtime
            if (table === 'meal_plans') {
              this.queryClient.invalidateQueries({ queryKey: ['plan-streak', householdId] })
            }
          }
        )
        .subscribe()

      this.channels.push(channel)
    }

    // Households table — UPDATE only, filtered by primary key
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
        () => {
          this.queryClient.invalidateQueries({ queryKey: ['household', householdId] })
        }
      )
      .subscribe()

    this.channels.push(householdChannel)

    // meal_plan_ingredients has no household_id — subscribe to all changes
    // and invalidate broadly; queries will re-fetch the correct data
    const mpiChannel = this.client
      .channel(`meal-plan-ingredients-${householdId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meal_plan_ingredients',
        },
        () => {
          this.queryClient.invalidateQueries({ queryKey: ['meal-plan-ingredients', householdId] })
          this.queryClient.invalidateQueries({ queryKey: ['meal-plans', householdId] })
        }
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
