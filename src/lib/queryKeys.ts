/**
 * Canonical TanStack Query key builders + the single source of truth for
 * "when table X changes, which cached queries do we have to refresh?".
 *
 * Two things live here:
 *
 *  1. `queryKeys` — builders so query keys are typed and never spelled
 *     differently in two places.
 *  2. `invalidateAfter(table, householdId, qc)` — the dependency graph
 *     used by both mutations (`onSuccess`) and the realtime subscription
 *     manager (`postgres_changes` callback).
 *
 * Why this exists: we used to scatter the "what depends on what" knowledge
 * across every mutation hook *and* the realtime manager. Adding a new
 * derived query (e.g. a weekly balance view) meant grepping the codebase
 * to find every place that might affect it. Putting the graph in one place
 * means a derived query only needs to be added to one map.
 *
 * If you add a new table or a new derived query, update `INVALIDATIONS`
 * here and every consumer benefits automatically.
 */
import type { QueryClient, QueryKey } from '@tanstack/react-query'

/** Names of the database tables that drive the realtime invalidation graph. */
export type HouseholdTable =
  | 'meal_plans'
  | 'meal_ideas'
  | 'todo_items'
  | 'reactions'
  | 'day_contexts'
  | 'ingredients'
  | 'day_placeholders'
  | 'household_members'
  | 'households'
  | 'meal_plan_ingredients'
  | 'meal_outcomes'

type Hh = string | undefined

/**
 * Canonical query-key builders. The first segment of a key is the cache
 * "namespace"; the second is always the household id so the realtime
 * manager can fan-out invalidations along the same axis as RLS.
 */
export const queryKeys = {
  mealPlans: (householdId: Hh, startDate?: string, endDate?: string): QueryKey =>
    startDate !== undefined && endDate !== undefined
      ? ['meal-plans', householdId, startDate, endDate]
      : ['meal-plans', householdId],
  mealIdeas: (householdId: Hh, startDate?: string, endDate?: string): QueryKey =>
    startDate !== undefined && endDate !== undefined
      ? ['meal-ideas', householdId, startDate, endDate]
      : ['meal-ideas', householdId],
  todoItems: (householdId: Hh, startDate?: string, endDate?: string): QueryKey =>
    startDate !== undefined && endDate !== undefined
      ? ['todo-items', householdId, startDate, endDate]
      : ['todo-items', householdId],
  reactions: (
    householdId: Hh,
    targetType?: string,
    targetIds?: readonly string[],
  ): QueryKey => {
    if (targetType === undefined) return ['reactions', householdId]
    if (targetIds === undefined) return ['reactions', householdId, targetType]
    return ['reactions', householdId, targetType, ...targetIds]
  },
  dayContexts: (householdId: Hh, startDate?: string, endDate?: string): QueryKey =>
    startDate !== undefined && endDate !== undefined
      ? ['day-contexts', householdId, startDate, endDate]
      : ['day-contexts', householdId],
  dayPlaceholders: (householdId: Hh): QueryKey => ['day-placeholders', householdId],
  ingredients: (householdId: Hh): QueryKey => ['ingredients', householdId],
  ingredientUsageStats: (householdId: Hh): QueryKey => [
    'ingredient-usage-stats',
    householdId,
  ],
  planStreak: (householdId: Hh, startDate?: string): QueryKey =>
    startDate !== undefined
      ? ['plan-streak', householdId, startDate]
      : ['plan-streak', householdId],
  household: (householdId: Hh): QueryKey => ['household', householdId],
  householdMembers: (householdId: Hh): QueryKey => ['household-members', householdId],
  householdInvites: (householdId: Hh): QueryKey => ['household-invites', householdId],
  mealPlanIngredients: (householdId: Hh): QueryKey => [
    'meal-plan-ingredients',
    householdId,
  ],
  /** Outcomes for the meals in a date window — same window as
   *  `mealPlans` so the calendar renders both with one fetch shape. */
  mealOutcomes: (householdId: Hh, startDate?: string, endDate?: string): QueryKey =>
    startDate !== undefined && endDate !== undefined
      ? ['meal-outcomes', householdId, startDate, endDate]
      : ['meal-outcomes', householdId],
  /** Cached "headline" stat shown on the unauthenticated welcome
   *  screen ("Successfully helped families plan N meals"). */
  publicStat: (key: string): QueryKey => ['public-stat', key],
  /** Top-level: every household the current user is a member of. */
  myHouseholds: (userId?: string): QueryKey =>
    userId !== undefined ? ['my-households', userId] : ['my-households'],
} as const

/**
 * The dependency graph: for each database table, list the query keys that
 * may have stale data after a row in that table changes. Mutations call
 * `invalidateAfter(table, householdId, queryClient)` after a successful
 * write, and `HouseholdRealtimeManager` does the same when Postgres pushes
 * a change over the websocket.
 *
 * Keep this list in sync with the queries declared above.
 */
type Invalidator = (qc: QueryClient, householdId: string) => void

const INVALIDATIONS: Record<HouseholdTable, Invalidator> = {
  meal_plans: (qc, hh) => {
    qc.invalidateQueries({ queryKey: queryKeys.mealPlans(hh) })
    qc.invalidateQueries({ queryKey: queryKeys.planStreak(hh) })
  },
  meal_ideas: (qc, hh) => {
    qc.invalidateQueries({ queryKey: queryKeys.mealIdeas(hh) })
    qc.invalidateQueries({ queryKey: queryKeys.reactions(hh, 'meal_idea') })
  },
  todo_items: (qc, hh) => {
    qc.invalidateQueries({ queryKey: queryKeys.todoItems(hh) })
  },
  reactions: (qc, hh) => {
    qc.invalidateQueries({ queryKey: queryKeys.reactions(hh) })
  },
  day_contexts: (qc, hh) => {
    qc.invalidateQueries({ queryKey: queryKeys.dayContexts(hh) })
  },
  ingredients: (qc, hh) => {
    qc.invalidateQueries({ queryKey: queryKeys.ingredients(hh) })
    qc.invalidateQueries({ queryKey: queryKeys.ingredientUsageStats(hh) })
  },
  day_placeholders: (qc, hh) => {
    qc.invalidateQueries({ queryKey: queryKeys.dayPlaceholders(hh) })
  },
  household_members: (qc, hh) => {
    qc.invalidateQueries({ queryKey: queryKeys.householdMembers(hh) })
    qc.invalidateQueries({ queryKey: queryKeys.myHouseholds() })
  },
  households: (qc, hh) => {
    qc.invalidateQueries({ queryKey: queryKeys.household(hh) })
    qc.invalidateQueries({ queryKey: queryKeys.myHouseholds() })
  },
  meal_plan_ingredients: (qc, hh) => {
    qc.invalidateQueries({ queryKey: queryKeys.mealPlanIngredients(hh) })
    qc.invalidateQueries({ queryKey: queryKeys.mealPlans(hh) })
    qc.invalidateQueries({ queryKey: queryKeys.ingredientUsageStats(hh) })
  },
  meal_outcomes: (qc, hh) => {
    qc.invalidateQueries({ queryKey: queryKeys.mealOutcomes(hh) })
    // The meal cards show outcome state inline, so refresh meal plans
    // too so styling (happy / neutral) updates with realtime changes.
    qc.invalidateQueries({ queryKey: queryKeys.mealPlans(hh) })
    // The cached public counter aggregates over meal_outcomes — bump
    // it so a tab on the welcome page sees changes within one
    // refetch interval rather than waiting for the daily cron.
    qc.invalidateQueries({ queryKey: queryKeys.publicStat('successful_meals_total') })
  },
}

/**
 * Invalidate every cached query that depends on `table` for the given
 * household. Idempotent and safe to call from both mutation `onSuccess`
 * callbacks and realtime websocket handlers.
 */
export function invalidateAfter(
  qc: QueryClient,
  table: HouseholdTable,
  householdId: string,
): void {
  INVALIDATIONS[table](qc, householdId)
}

/** Tables that have a `household_id` column we can filter realtime on. */
export const HOUSEHOLD_FILTERED_TABLES: readonly HouseholdTable[] = [
  'meal_plans',
  'meal_ideas',
  'todo_items',
  'reactions',
  'day_contexts',
  'ingredients',
  'day_placeholders',
  'household_members',
  'meal_outcomes',
] as const
