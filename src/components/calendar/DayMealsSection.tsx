import { useMemo, useState } from 'react'
import type { Database } from '../../types/database'
import {
  useDeleteMealPlan,
  type MealPlanWithIngredients,
} from '../../hooks/useMealPlans'
import {
  useReactions,
  useUpsertReaction,
  useDeleteReaction,
  type ReactionWithProfile,
} from '../../hooks/useMealIdeas'
import { useMealOutcomes } from '../../hooks/useMealOutcomes'
import { useAuth } from '../../hooks/useAuth'
import { canRecordOutcomes, type Audience } from '../../lib/permissions'
import { canRecordOutcomeOn, todayString } from '../../lib/outcomes'
import { useOverlay } from '../ui/OverlayProvider'
import MealCard from './MealCard'
import CopyMealTray from './CopyMealTray'
import OutcomeTray from './OutcomeTray'
import MealPromptGenerator from './MealPromptGenerator'
import Tray from '../ui/Tray'
import type { Reactor } from '../ui/ReactionButton'

type Household = Database['public']['Tables']['households']['Row']
type DayContext = Database['public']['Tables']['day_contexts']['Row']
type MealIdea = Database['public']['Tables']['meal_ideas']['Row']

function buildReactors(
  reactions: ReactionWithProfile[],
  currentUserId: string | undefined,
): Reactor[] {
  return reactions.map((r) => ({
    id: r.id,
    displayName: r.profiles?.display_name ?? 'Household member',
    emoji: r.emoji,
    isCurrentUser: !!currentUserId && r.user_id === currentUserId,
  }))
}

interface DayMealsSectionProps {
  date: string
  household: Household
  meals: MealPlanWithIngredients[]
  mealsLoading: boolean
  contexts: DayContext[]
  ideas: MealIdea[]
  ideaThumbs: Map<string, number>
  dayThemeLabel: string | null
  canEdit: boolean
  canVoteHere: boolean
  /** The current user's audience for *this* household. Used to gate
   *  the OutcomeButton (separately from canEdit, because future role
   *  divergence between meal-edit and outcome-record permissions is
   *  expected — see canRecordOutcomes in src/lib/permissions.ts). */
  currentRole: Audience
  onAddMeal: () => void
  onEditMeal: (mealId: string) => void
}

/**
 * Meals list + add button + magic-wand AI prompt + copy-meal tray.
 *
 * Owns its own slice: the meal_plan reactions query (keyed on the
 * loaded meal ids) and the local "which meal am I copying?" state.
 * Uses the global overlay slot for the AI tray so it doesn't fight
 * the ideas trays.
 */
export default function DayMealsSection({
  date,
  household,
  meals,
  mealsLoading,
  contexts,
  ideas,
  ideaThumbs,
  dayThemeLabel,
  canEdit,
  canVoteHere,
  currentRole,
  onAddMeal,
  onEditMeal,
}: DayMealsSectionProps) {
  const { user } = useAuth()
  const deleteMeal = useDeleteMealPlan()
  const upsertReaction = useUpsertReaction()
  const removeReaction = useDeleteReaction()

  const [copyingMeal, setCopyingMeal] = useState<MealPlanWithIngredients | null>(null)
  const [outcomeMeal, setOutcomeMeal] = useState<MealPlanWithIngredients | null>(null)
  // The set of meal_plan ids whose outcome was just-set this session.
  // Drives the one-shot flourish animation on the meal card. Kept in
  // state (rather than a ref) so updating it triggers a re-render and
  // so the React 19 lint rule `react-hooks/refs` is happy with us
  // reading it during render.
  const [justSetOutcomeIds, setJustSetOutcomeIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  )
  const promptTray = useOverlay(`day-detail:${date}:ai-prompt`)
  const copyTray = useOverlay(`day-detail:${date}:copy-meal`)
  const outcomeTray = useOverlay(`day-detail:${date}:outcome`)

  // Outcomes for this day's meals. We fetch with a single-day window
  // so the cache key matches the calendar's window queries — see
  // useMealOutcomes.
  const { byMealPlanId: outcomesByMealId } = useMealOutcomes(
    household.id,
    date,
    date,
  )

  const today = todayString()
  const canRecord = canRecordOutcomes(currentRole) && canRecordOutcomeOn(today, date)

  const mealIdsKey = meals.map((m) => m.id).join('|')
  const mealIds = useMemo(
    () => (mealIdsKey ? mealIdsKey.split('|') : []),
    [mealIdsKey],
  )
  const { data: reactions = [] } = useReactions(household.id, 'meal_plan', mealIds)

  const reactionsByMealId = useMemo(() => {
    const byMealId = new Map<string, ReactionWithProfile[]>()
    for (const r of reactions) {
      const cur = byMealId.get(r.target_id) ?? []
      cur.push(r)
      byMealId.set(r.target_id, cur)
    }
    return byMealId
  }, [reactions])

  const handleReact = async (mealId: string, emoji: string) => {
    if (!user) return
    await upsertReaction.mutateAsync({
      household_id: household.id,
      target_type: 'meal_plan',
      target_id: mealId,
      emoji,
      user_id: user.id,
    })
  }

  const handleUnreact = async (mealId: string) => {
    if (!user) return
    await removeReaction.mutateAsync({
      householdId: household.id,
      targetType: 'meal_plan',
      targetId: mealId,
      emoji: '👍',
      userId: user.id,
    })
  }

  const startCopy = (meal: MealPlanWithIngredients) => {
    setCopyingMeal(meal)
    copyTray.open()
  }

  const stopCopy = () => {
    setCopyingMeal(null)
    copyTray.close()
  }

  const startOutcome = (meal: MealPlanWithIngredients) => {
    setOutcomeMeal(meal)
    outcomeTray.open()
  }

  const stopOutcome = () => {
    setOutcomeMeal(null)
    outcomeTray.close()
  }

  return (
    <>
      {mealsLoading && (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-300 border-t-emerald-600" />
        </div>
      )}

      {!mealsLoading && meals.length === 0 && (
        <div className="py-8 text-center">
          <p className="text-gray-400">No meals planned yet</p>
          {canEdit && (
            <button
              type="button"
              onClick={() => promptTray.open()}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-purple-50 px-4 py-2.5 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-100"
              data-testid="magic-wand-button"
            >
              <span className="text-lg">🪄</span>
              Get AI meal suggestions
            </button>
          )}
        </div>
      )}

      <Tray
        isOpen={promptTray.isOpen}
        onClose={promptTray.close}
        title="🪄 AI Meal Suggestions"
        description="Generate a prompt to get meal ideas from AI"
      >
        <MealPromptGenerator
          household={household}
          date={date}
          contexts={contexts}
          dayTheme={dayThemeLabel}
          ideas={ideas.map((idea) => ({
            title: idea.title,
            thumbsUp: ideaThumbs.get(idea.id) ?? 0,
          }))}
        />
      </Tray>

      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Meal plans
        </h4>
        {meals.map((meal) => {
          const mealRxns = reactionsByMealId.get(meal.id) ?? []
          const reactors = buildReactors(mealRxns, user?.id)
          const currentUserEmoji =
            mealRxns.find((r) => r.user_id === user?.id && r.emoji === '👍')?.emoji ?? null
          const outcome = outcomesByMealId.get(meal.id)
          return (
            <MealCard
              key={meal.id}
              meal={meal}
              canEdit={canEdit}
              onEdit={() => onEditMeal(meal.id)}
              onDelete={() => deleteMeal.mutate({ id: meal.id, householdId: household.id })}
              onCopy={canEdit ? () => startCopy(meal) : undefined}
              reactors={reactors}
              currentUserEmoji={currentUserEmoji}
              onReact={(emoji) => handleReact(meal.id, emoji)}
              onUnreact={() => handleUnreact(meal.id)}
              canReact={canVoteHere && !!user}
              outcome={outcome}
              canRecordOutcome={canRecord}
              onOpenOutcome={canRecord ? () => startOutcome(meal) : undefined}
              flourish={justSetOutcomeIds.has(meal.id)}
            />
          )
        })}
      </div>

      {canEdit && (
        <button
          type="button"
          onClick={onAddMeal}
          className="w-full rounded-lg border-2 border-dashed border-emerald-200 py-3 text-sm font-medium text-emerald-600 transition-colors hover:border-emerald-400 hover:bg-emerald-50"
          data-testid="add-meal-button"
        >
          + Add meal
        </button>
      )}

      {copyingMeal && (
        <CopyMealTray
          isOpen={copyTray.isOpen}
          onClose={stopCopy}
          meal={copyingMeal}
          sourceDate={date}
        />
      )}

      {outcomeMeal && (
        <OutcomeTray
          key={outcomeMeal.id}
          isOpen={outcomeTray.isOpen}
          onClose={stopOutcome}
          mealPlanId={outcomeMeal.id}
          householdId={household.id}
          mealTitle={outcomeMeal.title}
          existing={outcomesByMealId.get(outcomeMeal.id)}
          onJustSet={() => {
            setJustSetOutcomeIds((prev) => {
              if (prev.has(outcomeMeal.id)) return prev
              const next = new Set(prev)
              next.add(outcomeMeal.id)
              return next
            })
          }}
        />
      )}
    </>
  )
}
