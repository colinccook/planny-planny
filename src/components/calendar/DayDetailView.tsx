import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { Database } from '../../types/database'
import { useMealPlans, useDayContexts, useDayPlaceholders } from '../../hooks/useMealPlans'
import { useMealIdeas, useReactions } from '../../hooks/useMealIdeas'
import { useTodos, useGroupedTodos } from '../../hooks/useTodos'
import { useAuth } from '../../hooks/useAuth'
import { toDateString } from '../../lib/dates'
import { canEditMeals, canProposeIdeas, canVote, type Audience } from '../../lib/permissions'
import FullScreenView from '../ui/FullScreenView'
import SwipeableDay from './SwipeableDay'
import TodoList from './TodoList'
import DayHeaderStrip from './DayHeaderStrip'
import DayEventsSection from './DayEventsSection'
import DayIdeasSection from './DayIdeasSection'
import { thumbsByIdeaId } from './dayIdeas'
import DayMealsSection from './DayMealsSection'

type Household = Database['public']['Tables']['households']['Row']

interface DayDetailViewProps {
  date: string
  household: Household
  currentRole: Audience
  onBack: () => void
  onAddMeal: () => void
  onEditMeal: (mealId: string) => void
  onAddTodo: () => void
  onEditTodo: (todoId: string) => void
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

/**
 * The day detail screen. This component used to be 700+ lines of mixed
 * data-fetching, state, derivations, and JSX. After the M1 refactor it
 * is a thin layout shell that:
 *
 *   1. fetches the day-level slices (meals, contexts, placeholders, ideas, todos);
 *   2. wires header navigation + swipe gestures;
 *   3. composes the per-section components.
 *
 * Per-section state (which tray is open, which idea is selected, the
 * "I'm copying this meal" working buffer) lives inside the section
 * components. Cross-section coordination (only one tray open at a
 * time) goes through `useOverlay`.
 */
export default function DayDetailView({
  date,
  household,
  currentRole,
  onBack,
  onAddMeal,
  onEditMeal,
  onAddTodo,
  onEditTodo,
  onPrevDay,
  onNextDay,
  enterFrom = null,
}: DayDetailViewProps) {
  const { user } = useAuth()
  const { data: meals = [], isLoading: mealsLoading } = useMealPlans(
    household.id,
    date,
    date,
  )
  const { data: contexts = [] } = useDayContexts(household.id, date, date)
  const { data: placeholders = [] } = useDayPlaceholders(household.id)
  const { data: ideas = [] } = useMealIdeas(household.id, date, date)

  // For the todo strip we need to span at least [today, date] because
  // incomplete todos may have been created on previous days and "rolled
  // forward" to today. The hook filters down to the displayed `date` via
  // `useGroupedTodos`.
  const todayStr = toDateString(new Date())
  const todoStart = date < todayStr ? date : todayStr
  const todoEnd = date > todayStr ? date : todayStr
  const { data: todos = [] } = useTodos(household.id, todoStart, todoEnd)
  const todosByDay = useGroupedTodos(todos, [date], todayStr, user?.id)
  const todosForDay = todosByDay.get(date) ?? []

  // Idea reactions are needed both by `DayIdeasSection` (to render the
  // little thumbs counts) and by `DayMealsSection` (to feed the AI
  // prompt with the most popular ideas). We fetch them once here and
  // derive the thumbs-up map; TanStack Query's cache dedupes the
  // identical query in the section, so this isn't a second round-trip.
  const ideaIdsKey = ideas.map((i) => i.id).join('|')
  const ideaIds = useMemo(
    () => (ideaIdsKey ? ideaIdsKey.split('|') : []),
    [ideaIdsKey],
  )
  const { data: ideaReactions = [] } = useReactions(
    household.id,
    'meal_idea',
    ideaIds,
  )
  const ideaThumbs = useMemo(() => thumbsByIdeaId(ideaReactions), [ideaReactions])

  const [y, m, d] = date.split('-').map(Number)
  const dateObj = new Date(y, m - 1, d)
  const dow = dateObj.getDay()
  const placeholder = placeholders.find((ph) => ph.day_of_week === dow)

  const canEdit = canEditMeals(currentRole)
  // canPropose has the same audience as canEdit today; kept separate so
  // "add an idea" can diverge from "edit a meal" later without
  // code-spelunking.
  const canPropose = canProposeIdeas(currentRole)
  const canVoteHere = canVote(currentRole)

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
          <DayHeaderStrip
            date={date}
            household={household}
            contexts={contexts}
            placeholderLabel={placeholder?.label ?? null}
            todoCount={todosForDay.length}
            ideaCount={ideas.length}
          />

          <TodoList
            householdId={household.id}
            date={date}
            today={todayStr}
            todos={todosForDay}
            currentRole={currentRole}
            onAddTodo={onAddTodo}
            onEditTodo={onEditTodo}
          />

          <DayEventsSection
            date={date}
            household={household}
            contexts={contexts}
            canEdit={canEdit}
          />

          <DayIdeasSection
            date={date}
            householdId={household.id}
            ideas={ideas}
            canPropose={canPropose}
            canEdit={canEdit}
          />

          <DayMealsSection
            date={date}
            household={household}
            meals={meals}
            mealsLoading={mealsLoading}
            contexts={contexts}
            ideas={ideas}
            ideaThumbs={ideaThumbs}
            dayThemeLabel={placeholder?.label ?? null}
            canEdit={canEdit}
            canVoteHere={canVoteHere}
            currentRole={currentRole}
            onAddMeal={onAddMeal}
            onEditMeal={onEditMeal}
          />
        </div>
      </SwipeableDay>
    </FullScreenView>
  )
}
