import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Database } from '../../types/database'
import {
  useMealPlans,
  useDayContexts,
  useDayPlaceholders,
  useDeleteMealPlan,
  useDeleteDayContext,
} from '../../hooks/useMealPlans'
import type { MealPlanWithIngredients } from '../../hooks/useMealPlans'
import {
  useMealIdeas,
  useCreateMealIdea,
  useDeleteMealIdea,
  useReactions,
  useUpsertReaction,
  useDeleteReaction,
} from '../../hooks/useMealIdeas'
import FullScreenView from '../ui/FullScreenView'
import MealCard from './MealCard'
import CopyMealTray from './CopyMealTray'
import DayContextBadge from './DayContextBadge'
import DayContextForm from './DayContextForm'
import MealPromptGenerator from './MealPromptGenerator'
import SwipeableDay from './SwipeableDay'
import Tray from '../ui/Tray'
import ReactionButton, {
  type Reactor,
  type ReactionOption,
} from '../ui/ReactionButton'
import type { ReactionWithProfile } from '../../hooks/useMealIdeas'
import { useAuth } from '../../hooks/useAuth'
import { canEditMeals, canProposeIdeas, canVote, type Audience } from '../../lib/permissions'

const THUMB_OPTIONS: ReactionOption[] = [{ emoji: '👍', label: 'Thumbs up' }]

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

type Household = Database['public']['Tables']['households']['Row']
type DayContext = Database['public']['Tables']['day_contexts']['Row']
type MealIdea = Database['public']['Tables']['meal_ideas']['Row']

interface DayDetailViewProps {
  date: string
  household: Household
  currentRole: Audience
  onBack: () => void
  onAddMeal: () => void
  onEditMeal: (mealId: string) => void
  /** Navigate to the previous day with a "slide in from left" animation. */
  onPrevDay?: () => void
  /** Navigate to the next day with a "slide in from right" animation. */
  onNextDay?: () => void
  /** Direction the day view should slide in from on mount. */
  enterFrom?: 'left' | 'right' | null
}

function formatDateLabel(dateStr: string): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)

  if (date.getTime() === today.getTime()) return 'Today'
  if (date.getTime() === tomorrow.getTime()) return 'Tomorrow'

  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date)
}

export default function DayDetailView({
  date,
  household,
  currentRole,
  onBack,
  onAddMeal,
  onEditMeal,
  onPrevDay,
  onNextDay,
  enterFrom = null,
}: DayDetailViewProps) {
  const [showAddEventForm, setShowAddEventForm] = useState(false)
  const [editingContextId, setEditingContextId] = useState<string | null>(null)
  const [showPromptTray, setShowPromptTray] = useState(false)
  const [copyingMeal, setCopyingMeal] = useState<MealPlanWithIngredients | null>(null)
  const [showAddIdeaTray, setShowAddIdeaTray] = useState(false)
  const [ideaTitle, setIdeaTitle] = useState('')
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null)

  const { data: meals = [], isLoading: mealsLoading } = useMealPlans(
    household.id,
    date,
    date,
  )
  const { data: contexts = [] } = useDayContexts(household.id, date, date)
  const { data: placeholders = [] } = useDayPlaceholders(household.id)
  const { data: ideas = [] } = useMealIdeas(household.id, date, date)
  const { user } = useAuth()
  const deleteMeal = useDeleteMealPlan()
  const deleteCtx = useDeleteDayContext()
  const createIdea = useCreateMealIdea()
  const deleteIdea = useDeleteMealIdea()
  const upsertReaction = useUpsertReaction()
  const removeReaction = useDeleteReaction()
  const canEdit = canEditMeals(currentRole)
  // canPropose has the same audience as canEdit today; kept
  // separate so that "add an idea" can diverge from "edit a
  // meal" later without code-spelunking.
  const canPropose = canProposeIdeas(currentRole)
  const canVoteHere = canVote(currentRole)
  const ideaIdsKey = ideas.map((idea) => idea.id).join('|')
  const ideaIds = useMemo(
    () => (ideaIdsKey ? ideaIdsKey.split('|') : []),
    [ideaIdsKey],
  )
  const { data: ideaReactions = [] } = useReactions(
    household.id,
    'meal_idea',
    ideaIds,
  )
  const mealIdsKey = meals.map((meal) => meal.id).join('|')
  const mealIds = useMemo(
    () => (mealIdsKey ? mealIdsKey.split('|') : []),
    [mealIdsKey],
  )
  const { data: mealReactions = [] } = useReactions(
    household.id,
    'meal_plan',
    mealIds,
  )
  const reactionsByMealId = useMemo(() => {
    const byMealId = new Map<string, ReactionWithProfile[]>()
    for (const reaction of mealReactions) {
      const current = byMealId.get(reaction.target_id) ?? []
      current.push(reaction)
      byMealId.set(reaction.target_id, current)
    }
    return byMealId
  }, [mealReactions])
  const selectedIdea = ideas.find((idea) => idea.id === selectedIdeaId) ?? null
  const reactionsByIdeaId = useMemo(() => {
    const byIdeaId = new Map<string, ReactionWithProfile[]>()
    for (const reaction of ideaReactions) {
      const current = byIdeaId.get(reaction.target_id) ?? []
      current.push(reaction)
      byIdeaId.set(reaction.target_id, current)
    }
    return byIdeaId
  }, [ideaReactions])
  const selectedIdeaReactions = useMemo(
    () =>
      selectedIdeaId === null ? [] : (reactionsByIdeaId.get(selectedIdeaId) ?? []),
    [reactionsByIdeaId, selectedIdeaId],
  )
  const selectedIdeaThumbUsers = useMemo(
    () => selectedIdeaReactions.filter((reaction) => reaction.emoji === '👍'),
    [selectedIdeaReactions],
  )
  const hasSelectedIdeaThumbed = useMemo(
    () =>
      !!user &&
      selectedIdeaThumbUsers.some((reaction) => reaction.user_id === user.id),
    [selectedIdeaThumbUsers, user],
  )
  const thumbsByIdeaId = useMemo(() => {
    const counts = new Map<string, number>()
    for (const reaction of ideaReactions) {
      if (reaction.emoji !== '👍') continue
      counts.set(reaction.target_id, (counts.get(reaction.target_id) ?? 0) + 1)
    }
    return counts
  }, [ideaReactions])

  const [y, m, d] = date.split('-').map(Number)
  const dateObj = new Date(y, m - 1, d)
  const dow = dateObj.getDay()
  const placeholder = placeholders.find((ph) => ph.day_of_week === dow)

  const handleDeleteMeal = (mealId: string) => {
    deleteMeal.mutate({ id: mealId, householdId: household.id })
  }

  const handleDeleteContext = (ctxId: string) => {
    deleteCtx.mutate({ id: ctxId, householdId: household.id })
  }

  const handleAddIdea = async () => {
    const trimmedTitle = ideaTitle.trim()
    if (!trimmedTitle) return
    await createIdea.mutateAsync({
      household_id: household.id,
      date,
      title: trimmedTitle,
    })
    setIdeaTitle('')
    setShowAddIdeaTray(false)
  }

  const handleDeleteIdea = async (ideaId: string) => {
    await deleteIdea.mutateAsync({ id: ideaId, householdId: household.id })
    if (selectedIdeaId === ideaId) {
      setSelectedIdeaId(null)
    }
  }

  const handleReact = async (
    targetType: 'meal_idea' | 'meal_plan',
    targetId: string,
    emoji: string,
  ) => {
    if (!user) return
    await upsertReaction.mutateAsync({
      household_id: household.id,
      target_type: targetType,
      target_id: targetId,
      emoji,
      user_id: user.id,
    })
  }

  const handleUnreact = async (
    targetType: 'meal_idea' | 'meal_plan',
    targetId: string,
    emoji: string,
  ) => {
    if (!user) return
    await removeReaction.mutateAsync({
      householdId: household.id,
      targetType,
      targetId,
      emoji,
      userId: user.id,
    })
  }

  const handleMealSwipe = useCallback(
    (direction: 'left' | 'right', mealId: string) => {
      const mealEls = Array.from(
        document.querySelectorAll<HTMLElement>('[data-meal-card="true"]'),
      )
      const idx = mealEls.findIndex((el) => el.dataset.mealId === mealId)
      if (idx === -1) return
      const targetIdx = direction === 'left' ? idx + 1 : idx - 1
      const target = mealEls[targetIdx]
      if (!target) return
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      target.classList.add('ring-2', 'ring-emerald-300')
      window.setTimeout(() => {
        target.classList.remove('ring-2', 'ring-emerald-300')
      }, 700)
    },
    [],
  )

  // Keep the latest navigation callbacks in a ref so SwipeableDay
  // doesn't need to re-bind listeners every render.
  const onPrevRef = useRef(onPrevDay)
  const onNextRef = useRef(onNextDay)
  useEffect(() => {
    onPrevRef.current = onPrevDay
    onNextRef.current = onNextDay
  }, [onPrevDay, onNextDay])

  return (
    <FullScreenView title={formatDateLabel(date)} onBack={onBack}>
      <SwipeableDay
        date={date}
        enterFrom={enterFrom}
        onSwipeLeft={() => onNextRef.current?.()}
        onSwipeRight={() => onPrevRef.current?.()}
        onMealSwipe={handleMealSwipe}
      >
      <div className="space-y-4 p-4">
        {/* Context badge and placeholder */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <DayContextBadge
            defaultAdults={household.default_adults}
            defaultChildren={household.default_children}
            defaultBabies={household.default_babies}
            contexts={contexts}
          />
          {placeholder && (
            <span className="text-sm italic text-emerald-500">
              {placeholder.label}
            </span>
          )}
        </div>

        {/* Events list */}
        {contexts.length > 0 && (
          <div className="space-y-2" data-testid="events-list">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Events</h4>
            {contexts.map((ctx) =>
              editingContextId === ctx.id ? (
                <DayContextForm
                  key={ctx.id}
                  householdId={household.id}
                  date={date}
                  existing={ctx}
                  household={household}
                  onClose={() => setEditingContextId(null)}
                />
              ) : (
                <EventCard
                  key={ctx.id}
                  context={ctx}
                  canEdit={canEdit}
                  onEdit={() => setEditingContextId(ctx.id)}
                  onDelete={() => handleDeleteContext(ctx.id)}
                />
              ),
            )}
          </div>
        )}

        {/* Add event form */}
        {showAddEventForm && (
          <DayContextForm
            householdId={household.id}
            date={date}
            household={household}
            onClose={() => setShowAddEventForm(false)}
          />
        )}

        {/* Add event button */}
        {canEdit && !showAddEventForm && (
          <button
            type="button"
            onClick={() => setShowAddEventForm(true)}
            className="w-full rounded-lg border-2 border-dashed border-amber-200 py-2.5 text-sm font-medium text-amber-600 transition-colors hover:border-amber-400 hover:bg-amber-50"
            data-testid="add-event-button"
          >
            + Add event
          </button>
        )}

        {/* Ideas list */}
        {ideas.length > 0 && (
          <div className="space-y-2" data-testid="ideas-list">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Ideas</h4>
            {ideas.map((idea) => {
              const ideaRxns = reactionsByIdeaId.get(idea.id) ?? []
              const reactors = buildReactors(ideaRxns, user?.id)
              const currentUserEmoji = ideaRxns.find(
                (r) => r.user_id === user?.id && r.emoji === '👍',
              )?.emoji ?? null
              return (
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  reactors={reactors}
                  currentUserEmoji={currentUserEmoji}
                  onOpen={() => setSelectedIdeaId(idea.id)}
                  onReact={(emoji) => handleReact('meal_idea', idea.id, emoji)}
                  onUnreact={() => handleUnreact('meal_idea', idea.id, '👍')}
                />
              )
            })}
          </div>
        )}

        {/* Add idea button */}
        {canPropose && (
          <button
            type="button"
            onClick={() => setShowAddIdeaTray(true)}
            className="w-full rounded-lg border-2 border-dashed border-indigo-200 py-2.5 text-sm font-medium text-indigo-600 transition-colors hover:border-indigo-400 hover:bg-indigo-50"
            data-testid="add-idea-button"
          >
            + Add idea
          </button>
        )}

        {/* Loading state */}
        {mealsLoading && (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-300 border-t-emerald-600" />
          </div>
        )}

        {/* Empty state with magic wand */}
        {!mealsLoading && meals.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-gray-400">No meals planned yet</p>
            {canEdit && (
              <button
                type="button"
                onClick={() => setShowPromptTray(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-purple-50 px-4 py-2.5 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-100"
                data-testid="magic-wand-button"
              >
                <span className="text-lg">🪄</span>
                Get AI meal suggestions
              </button>
            )}
          </div>
        )}

        {/* AI prompt tray */}
        <Tray
          isOpen={showPromptTray}
          onClose={() => setShowPromptTray(false)}
          title="🪄 AI Meal Suggestions"
          description="Generate a prompt to get meal ideas from AI"
        >
          <MealPromptGenerator
            household={household}
            date={date}
            contexts={contexts}
            dayTheme={placeholder?.label ?? null}
            ideas={ideas.map((idea) => ({
              title: idea.title,
              thumbsUp: thumbsByIdeaId.get(idea.id) ?? 0,
            }))}
          />
        </Tray>

        {/* Meals list */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Meal plans</h4>
          {meals.map((meal) => {
            const mealRxns = reactionsByMealId.get(meal.id) ?? []
            const reactors = buildReactors(mealRxns, user?.id)
            const currentUserEmoji = mealRxns.find(
              (r) => r.user_id === user?.id && r.emoji === '👍',
            )?.emoji ?? null
            return (
              <MealCard
                key={meal.id}
                meal={meal}
                canEdit={canEdit}
                onEdit={() => onEditMeal(meal.id)}
                onDelete={() => handleDeleteMeal(meal.id)}
                onCopy={canEdit ? () => setCopyingMeal(meal) : undefined}
                reactors={reactors}
                currentUserEmoji={currentUserEmoji}
                onReact={(emoji) => handleReact('meal_plan', meal.id, emoji)}
                onUnreact={() => handleUnreact('meal_plan', meal.id, '👍')}
                canReact={canVoteHere && !!user}
              />
            )
          })}
        </div>

        {/* Add meal button */}
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

        {/* Copy/Move meal tray */}
        {copyingMeal && (
          <CopyMealTray
            isOpen={!!copyingMeal}
            onClose={() => setCopyingMeal(null)}
            meal={copyingMeal}
            sourceDate={date}
          />
        )}

        {/* Add idea tray */}
        <Tray
          isOpen={showAddIdeaTray}
          onClose={() => setShowAddIdeaTray(false)}
          title="Add an idea"
          description="Capture a meal idea for this day"
        >
          <div className="space-y-3">
            <input
              type="text"
              value={ideaTitle}
              onChange={(e) => setIdeaTitle(e.target.value)}
              placeholder="e.g. Burgers"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              autoFocus
              data-testid="meal-idea-input"
            />
            <button
              type="button"
              onClick={handleAddIdea}
              disabled={createIdea.isPending || !ideaTitle.trim()}
              className="w-full rounded-xl bg-indigo-600 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
              data-testid="save-idea-button"
            >
              {createIdea.isPending ? 'Saving…' : 'Save idea'}
            </button>
          </div>
        </Tray>

        {/* Idea detail tray */}
        <Tray
          isOpen={!!selectedIdea}
          onClose={() => {
            setSelectedIdeaId(null)
          }}
          title={selectedIdea?.title ?? 'Idea'}
          description="See reactions from your household"
        >
          {selectedIdea && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Reactions</p>
                <ReactionButton
                  options={THUMB_OPTIONS}
                  reactors={buildReactors(selectedIdeaReactions, user?.id)}
                  currentUserEmoji={hasSelectedIdeaThumbed ? '👍' : null}
                  onReact={(emoji) => handleReact('meal_idea', selectedIdea.id, emoji)}
                  onUnreact={() => handleUnreact('meal_idea', selectedIdea.id, '👍')}
                  disabled={upsertReaction.isPending || removeReaction.isPending}
                  targetLabel={selectedIdea.title}
                  testId={`idea-detail-reaction-${selectedIdea.id}`}
                />
              </div>

              {canEdit && (
                <button
                  type="button"
                  onClick={() => handleDeleteIdea(selectedIdea.id)}
                  disabled={deleteIdea.isPending}
                  className="w-full rounded-xl bg-red-50 py-3 text-base font-semibold text-red-600 ring-1 ring-red-100 transition-colors hover:bg-red-100 disabled:opacity-50"
                  data-testid="delete-idea-button"
                >
                  Delete idea
                </button>
              )}
            </div>
          )}
        </Tray>
      </div>
      </SwipeableDay>
    </FullScreenView>
  )
}

// ── Event Card ─────────────────────────────────────────────

interface EventCardProps {
  context: DayContext
  canEdit: boolean
  onEdit: () => void
  onDelete: () => void
}

function EventCard({ context, canEdit, onEdit, onDelete }: EventCardProps) {
  const changes: string[] = []
  const accessibleChanges: string[] = []
  if (context.extra_adults !== 0) {
    const sign = context.extra_adults > 0 ? '+' : ''
    changes.push(`${sign}${context.extra_adults} 🧑`)
    accessibleChanges.push(`${sign}${context.extra_adults} adults`)
  }
  if (context.extra_children !== 0) {
    const sign = context.extra_children > 0 ? '+' : ''
    changes.push(`${sign}${context.extra_children} 🧒`)
    accessibleChanges.push(`${sign}${context.extra_children} children`)
  }
  if (context.extra_babies !== 0) {
    const sign = context.extra_babies > 0 ? '+' : ''
    changes.push(`${sign}${context.extra_babies} 👶`)
    accessibleChanges.push(`${sign}${context.extra_babies} babies`)
  }

  return (
    <div
      className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 ring-1 ring-amber-100"
      data-testid={`event-card-${context.id}`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900">
          {context.event_name || 'Headcount change'}
        </p>
        {changes.length > 0 && (
          <p className="mt-0.5 text-xs text-gray-500" aria-label={accessibleChanges.join(', ')}>{changes.join('  ')}</p>
        )}
      </div>
      {canEdit && (
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-md p-1.5 text-gray-400 hover:bg-amber-100 hover:text-gray-600"
            aria-label={`Edit ${context.event_name || 'event'}`}
            data-testid={`edit-event-${context.id}`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
            aria-label={`Delete ${context.event_name || 'event'}`}
            data-testid={`delete-event-${context.id}`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

// ── Idea Card ──────────────────────────────────────────────

interface IdeaCardProps {
  idea: MealIdea
  reactors: Reactor[]
  currentUserEmoji: string | null
  onOpen: () => void
  onReact: (emoji: string) => void | Promise<void>
  onUnreact: () => void | Promise<void>
}

function IdeaCard({
  idea,
  reactors,
  currentUserEmoji,
  onOpen,
  onReact,
  onUnreact,
}: IdeaCardProps) {
  return (
    <div
      className="flex w-full items-center justify-between gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-left ring-1 ring-indigo-100"
      data-testid={`idea-card-${idea.id}`}
    >
      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 text-left"
      >
        <p className="truncate text-sm font-medium text-gray-900">{idea.title}</p>
      </button>
      <ReactionButton
        options={THUMB_OPTIONS}
        reactors={reactors}
        currentUserEmoji={currentUserEmoji}
        onReact={onReact}
        onUnreact={onUnreact}
        size="sm"
        targetLabel={idea.title}
        testId={`idea-reaction-${idea.id}`}
      />
    </div>
  )
}
