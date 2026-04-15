import { useState } from 'react'
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
import Tray from '../ui/Tray'
import { useAuth } from '../../hooks/useAuth'

type Household = Database['public']['Tables']['households']['Row']
type DayContext = Database['public']['Tables']['day_contexts']['Row']
type MealIdea = Database['public']['Tables']['meal_ideas']['Row']

interface DayDetailViewProps {
  date: string
  household: Household
  currentRole: 'owner' | 'member' | 'guest' | null
  onBack: () => void
  onAddMeal: () => void
  onEditMeal: (mealId: string) => void
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
}: DayDetailViewProps) {
  const [showAddEventForm, setShowAddEventForm] = useState(false)
  const [editingContextId, setEditingContextId] = useState<string | null>(null)
  const [showPromptTray, setShowPromptTray] = useState(false)
  const [copyingMeal, setCopyingMeal] = useState<MealPlanWithIngredients | null>(null)
  const [showAddIdeaTray, setShowAddIdeaTray] = useState(false)
  const [ideaTitle, setIdeaTitle] = useState('')
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null)
  const [showReactionTray, setShowReactionTray] = useState(false)

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
  const canEdit = currentRole === 'owner' || currentRole === 'member'
  const ideaIds = ideas.map((idea) => idea.id)
  const { data: ideaReactions = [] } = useReactions(
    household.id,
    'meal_idea',
    ideaIds,
  )
  const selectedIdea = ideas.find((idea) => idea.id === selectedIdeaId) ?? null
  const selectedIdeaReactions =
    selectedIdeaId === null
      ? []
      : ideaReactions.filter((reaction) => reaction.target_id === selectedIdeaId)
  const selectedIdeaThumbUsers = selectedIdeaReactions.filter(
    (reaction) => reaction.emoji === '👍',
  )
  const hasSelectedIdeaThumbed =
    !!user &&
    selectedIdeaThumbUsers.some((reaction) => reaction.user_id === user.id)

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
      setShowReactionTray(false)
    }
  }

  const handleToggleThumb = async (ideaId: string) => {
    if (!user) return
    const hasThumbed = ideaReactions.some(
      (reaction) =>
        reaction.target_id === ideaId &&
        reaction.emoji === '👍' &&
        reaction.user_id === user.id,
    )
    if (hasThumbed) {
      await removeReaction.mutateAsync({
        householdId: household.id,
        targetType: 'meal_idea',
        targetId: ideaId,
        emoji: '👍',
        userId: user.id,
      })
    } else {
      await upsertReaction.mutateAsync({
        household_id: household.id,
        target_type: 'meal_idea',
        target_id: ideaId,
        emoji: '👍',
        user_id: user.id,
      })
    }
    setShowReactionTray(false)
  }

  return (
    <FullScreenView title={formatDateLabel(date)} onBack={onBack}>
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
              const thumbsCount = ideaReactions.filter(
                (reaction) =>
                  reaction.target_id === idea.id && reaction.emoji === '👍',
              ).length
              return (
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  thumbsCount={thumbsCount}
                  onOpen={() => {
                    setSelectedIdeaId(idea.id)
                    setShowReactionTray(false)
                  }}
                />
              )
            })}
          </div>
        )}

        {/* Add idea button */}
        {canEdit && (
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
          />
        </Tray>

        {/* Meals list */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Meal plans</h4>
          {meals.map((meal) => (
            <MealCard
              key={meal.id}
              meal={meal}
              canEdit={canEdit}
              onEdit={() => onEditMeal(meal.id)}
              onDelete={() => handleDeleteMeal(meal.id)}
              onCopy={canEdit ? () => setCopyingMeal(meal) : undefined}
            />
          ))}
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
            setShowReactionTray(false)
          }}
          title={selectedIdea?.title ?? 'Idea'}
          description="See reactions from your household"
        >
          {selectedIdea && (
            <div className="space-y-4">
              <div className="rounded-lg bg-indigo-50 px-3 py-2 ring-1 ring-indigo-100">
                <p className="text-sm font-medium text-indigo-900">👍 {selectedIdeaThumbUsers.length}</p>
              </div>

              {selectedIdeaThumbUsers.length > 0 ? (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Thumbed up by</p>
                  <ul className="space-y-1 text-sm text-gray-700" data-testid="idea-reactors-list">
                    {selectedIdeaThumbUsers.map((reaction) => (
                      <li key={reaction.id}>
                        {reaction.profiles?.display_name ?? 'Household member'}
                        {reaction.user_id === user?.id ? ' (you)' : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-gray-500" data-testid="idea-reactors-empty">
                  No thumbs up yet.
                </p>
              )}

              <button
                type="button"
                onClick={() => setShowReactionTray(true)}
                className="w-full rounded-xl bg-indigo-600 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
                data-testid="open-react-to-idea-button"
              >
                React to this
              </button>

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

        {/* Reaction picker tray */}
        <Tray
          isOpen={!!selectedIdea && showReactionTray}
          onClose={() => setShowReactionTray(false)}
          title="React to this idea"
          description="Choose an emoji reaction"
        >
          {selectedIdea && (
            <button
              type="button"
              onClick={() => handleToggleThumb(selectedIdea.id)}
              disabled={upsertReaction.isPending || removeReaction.isPending}
              className="w-full rounded-xl bg-indigo-50 px-4 py-4 text-left text-base font-semibold text-indigo-700 ring-1 ring-indigo-100 transition-colors hover:bg-indigo-100 disabled:opacity-50"
              data-testid="thumbs-up-reaction-button"
            >
              {hasSelectedIdeaThumbed ? 'Remove 👍' : '👍 Thumbs up'}
            </button>
          )}
        </Tray>
      </div>
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
  thumbsCount: number
  onOpen: () => void
}

function IdeaCard({ idea, thumbsCount, onOpen }: IdeaCardProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center justify-between gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-left ring-1 ring-indigo-100 transition-colors hover:bg-indigo-100"
      data-testid={`idea-card-${idea.id}`}
    >
      <p className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">{idea.title}</p>
      <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200">
        👍 {thumbsCount}
      </span>
    </button>
  )
}
