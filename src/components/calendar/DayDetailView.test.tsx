import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { OverlayProvider } from '../ui/OverlayProvider'

const mockUseMealPlans = vi.fn()
const mockUseDayContexts = vi.fn()
const mockUseDayPlaceholders = vi.fn()
const mockUseDeleteMealPlan = vi.fn()
const mockUseDeleteDayContext = vi.fn()

vi.mock('../../hooks/useMealPlans', () => ({
  useMealPlans: (...args: unknown[]) => mockUseMealPlans(...args),
  useDayContexts: (...args: unknown[]) => mockUseDayContexts(...args),
  useDayPlaceholders: (...args: unknown[]) => mockUseDayPlaceholders(...args),
  useDeleteMealPlan: (...args: unknown[]) => mockUseDeleteMealPlan(...args),
  useDeleteDayContext: (...args: unknown[]) => mockUseDeleteDayContext(...args),
}))

const mockUseMealIdeas = vi.fn()
const mockUseCreateMealIdea = vi.fn()
const mockUseDeleteMealIdea = vi.fn()
const mockUseReactions = vi.fn()
const mockUseUpsertReaction = vi.fn()
const mockUseDeleteReaction = vi.fn()

vi.mock('../../hooks/useMealIdeas', () => ({
  useMealIdeas: (...args: unknown[]) => mockUseMealIdeas(...args),
  useCreateMealIdea: (...args: unknown[]) => mockUseCreateMealIdea(...args),
  useDeleteMealIdea: (...args: unknown[]) => mockUseDeleteMealIdea(...args),
  useReactions: (...args: unknown[]) => mockUseReactions(...args),
  useUpsertReaction: (...args: unknown[]) => mockUseUpsertReaction(...args),
  useDeleteReaction: (...args: unknown[]) => mockUseDeleteReaction(...args),
}))

const mockUseTodos = vi.fn()
const mockMutate = { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }
vi.mock('../../hooks/useTodos', () => ({
  useTodos: (...args: unknown[]) => mockUseTodos(...args),
  useGroupedTodos: () => new Map(),
  useCreateTodo: () => mockMutate,
  useCompleteTodo: () => mockMutate,
  useReopenTodo: () => mockMutate,
  useDeleteTodo: () => mockMutate,
  todoBelongsOnDay: () => false,
  groupTodosByDay: () => new Map(),
}))

const mockUseAuth = vi.fn()

vi.mock('../../hooks/useAuth', () => ({
  useAuth: (...args: unknown[]) => mockUseAuth(...args),
}))

// useMealOutcomes makes a TanStack Query call inside DayMealsSection;
// the existing tests don't set up a QueryClientProvider, so stub the
// hook out. Returns an empty Map → no outcomes, no happy state, no
// flourish — all defaults match the original DayMealsSection behaviour
// before the outcomes feature.
vi.mock('../../hooks/useMealOutcomes', async () => {
  const actual = await vi.importActual<typeof import('../../hooks/useMealOutcomes')>(
    '../../hooks/useMealOutcomes',
  )
  return {
    ...actual,
    useMealOutcomes: () => ({ byMealPlanId: new Map(), data: [] }),
    useUpsertMealOutcome: () => ({
      mutate: vi.fn(),
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
    }),
    useDeleteMealOutcome: () => ({
      mutate: vi.fn(),
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
    }),
  }
})

vi.mock('./MealPromptGenerator', () => ({
  default: () => null,
}))

vi.mock('../ui/FullScreenView', () => ({
  default: ({ children }: { children?: ReactNode }) =>
    createElement('div', null, children),
}))

import DayDetailView from './DayDetailView'

function renderDay(props: Parameters<typeof DayDetailView>[0]) {
  return render(
    createElement(OverlayProvider, null, createElement(DayDetailView, props)),
  )
}

describe('DayDetailView ideas and reactions', () => {
  const household = {
    id: 'hh-1',
    name: 'Home',
    alias: null,
    default_adults: 2,
    default_children: 1,
    default_babies: 0,
    public_share_token: null,
    created_by: 'u-1',
    created_at: '2026-01-01T00:00:00Z',
  }

  const deleteMealMutate = vi.fn()
  const deleteCtxMutate = vi.fn()
  const createIdeaMutateAsync = vi.fn().mockResolvedValue(undefined)
  const deleteIdeaMutateAsync = vi.fn().mockResolvedValue(undefined)
  const upsertReactionMutateAsync = vi.fn().mockResolvedValue(undefined)
  const deleteReactionMutateAsync = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    vi.clearAllMocks()

    mockUseMealPlans.mockReturnValue({
      data: [
        {
          id: 'meal-1',
          household_id: 'hh-1',
          date: '2026-04-20',
          title: 'Fajitas',
          description: null,
          created_by: 'u-1',
          created_at: '2026-04-20T10:00:00Z',
          updated_at: '2026-04-20T10:00:00Z',
          meal_plan_ingredients: [],
        },
      ],
      isLoading: false,
    })
    mockUseDayContexts.mockReturnValue({
      data: [
        {
          id: 'ctx-1',
          household_id: 'hh-1',
          date: '2026-04-20',
          end_date: null,
          event_name: 'Football night',
          extra_adults: 1,
          extra_children: 0,
          extra_babies: 0,
          created_at: '2026-04-20T09:00:00Z',
        },
      ],
    })
    mockUseDayPlaceholders.mockReturnValue({ data: [] })
    mockUseDeleteMealPlan.mockReturnValue({ mutate: deleteMealMutate })
    mockUseDeleteDayContext.mockReturnValue({ mutate: deleteCtxMutate })
    mockUseTodos.mockReturnValue({ data: [] })

    mockUseMealIdeas.mockReturnValue({
      data: [
        {
          id: 'idea-1',
          household_id: 'hh-1',
          date: '2026-04-20',
          title: 'Burgers',
          created_by: 'u-1',
          created_at: '2026-04-20T08:00:00Z',
        },
      ],
    })
    mockUseReactions.mockImplementation(
      (_householdId: string | undefined, targetType: string) => {
        if (targetType === 'meal_idea') {
          return {
            data: [
              {
                id: 'r-1',
                household_id: 'hh-1',
                target_type: 'meal_idea',
                target_id: 'idea-1',
                emoji: '👍',
                user_id: 'u-2',
                created_at: '2026-04-20T11:00:00Z',
                profiles: { display_name: 'Casey', avatar_url: null },
              },
            ],
          }
        }
        return { data: [] }
      },
    )
    mockUseCreateMealIdea.mockReturnValue({
      mutateAsync: createIdeaMutateAsync,
      isPending: false,
    })
    mockUseDeleteMealIdea.mockReturnValue({
      mutateAsync: deleteIdeaMutateAsync,
      isPending: false,
    })
    mockUseUpsertReaction.mockReturnValue({
      mutateAsync: upsertReactionMutateAsync,
      isPending: false,
    })
    mockUseDeleteReaction.mockReturnValue({
      mutateAsync: deleteReactionMutateAsync,
      isPending: false,
    })
    mockUseAuth.mockReturnValue({
      user: { id: 'u-1' },
    })
  })

  it('renders Events, Ideas, and Meal plans sections with thumbs count', () => {
    renderDay({
        date: '2026-04-20',
        household,
        currentRole: 'member',
        onBack: vi.fn(),
        onAddMeal: vi.fn(),
        onEditMeal: vi.fn(),
        onAddTodo: vi.fn(),
        onEditTodo: vi.fn(),
      })

    expect(screen.getByText('Events')).toBeDefined()
    expect(screen.getByText('Ideas')).toBeDefined()
    expect(screen.getByText('Meal plans')).toBeDefined()
    expect(screen.getByText('Burgers')).toBeDefined()
    expect(screen.getByTestId('idea-reaction-idea-1').textContent).toContain('1')
  })

  it('adds a meal idea from the tray', async () => {
    renderDay({
        date: '2026-04-20',
        household,
        currentRole: 'member',
        onBack: vi.fn(),
        onAddMeal: vi.fn(),
        onEditMeal: vi.fn(),
        onAddTodo: vi.fn(),
        onEditTodo: vi.fn(),
      })

    fireEvent.click(screen.getByTestId('add-idea-button'))
    fireEvent.change(screen.getByTestId('meal-idea-input'), {
      target: { value: 'Pasta bake' },
    })
    fireEvent.click(screen.getByTestId('save-idea-button'))

    await waitFor(() => {
      expect(createIdeaMutateAsync).toHaveBeenCalledWith({
        household_id: 'hh-1',
        date: '2026-04-20',
        title: 'Pasta bake',
      })
    })
  })

  it('shows delete action from idea detail tray', async () => {
    renderDay({
        date: '2026-04-20',
        household,
        currentRole: 'member',
        onBack: vi.fn(),
        onAddMeal: vi.fn(),
        onEditMeal: vi.fn(),
        onAddTodo: vi.fn(),
        onEditTodo: vi.fn(),
      })

    fireEvent.click(screen.getByText('Burgers'))

    fireEvent.click(screen.getByTestId('delete-idea-button'))

    await waitFor(() => {
      expect(deleteIdeaMutateAsync).toHaveBeenCalledWith({
        id: 'idea-1',
        householdId: 'hh-1',
      })
    })
  })

  it('adds a thumbs-up reaction to an idea via the card reaction button', async () => {
    renderDay({
        date: '2026-04-20',
        household,
        currentRole: 'member',
        onBack: vi.fn(),
        onAddMeal: vi.fn(),
        onEditMeal: vi.fn(),
        onAddTodo: vi.fn(),
        onEditTodo: vi.fn(),
      })

    fireEvent.click(screen.getByTestId('idea-reaction-idea-1'))

    await waitFor(() => {
      expect(upsertReactionMutateAsync).toHaveBeenCalledWith({
        household_id: 'hh-1',
        target_type: 'meal_idea',
        target_id: 'idea-1',
        emoji: '👍',
        user_id: 'u-1',
      })
    })
  })

  it('removes thumbs-up from an idea when the current user already reacted', async () => {
    mockUseReactions.mockImplementation(
      (_householdId: string | undefined, targetType: string) => {
        if (targetType === 'meal_idea') {
          return {
            data: [
              {
                id: 'r-1',
                household_id: 'hh-1',
                target_type: 'meal_idea',
                target_id: 'idea-1',
                emoji: '👍',
                user_id: 'u-1',
                created_at: '2026-04-20T11:00:00Z',
                profiles: { display_name: 'You', avatar_url: null },
              },
            ],
          }
        }
        return { data: [] }
      },
    )

    renderDay({
        date: '2026-04-20',
        household,
        currentRole: 'member',
        onBack: vi.fn(),
        onAddMeal: vi.fn(),
        onEditMeal: vi.fn(),
        onAddTodo: vi.fn(),
        onEditTodo: vi.fn(),
      })

    fireEvent.click(screen.getByTestId('idea-reaction-idea-1'))

    await waitFor(() => {
      expect(deleteReactionMutateAsync).toHaveBeenCalledWith({
        householdId: 'hh-1',
        targetType: 'meal_idea',
        targetId: 'idea-1',
        emoji: '👍',
        userId: 'u-1',
      })
    })
  })

  it('adds a thumbs-up reaction to a meal via the meal card reaction button', async () => {
    renderDay({
        date: '2026-04-20',
        household,
        currentRole: 'member',
        onBack: vi.fn(),
        onAddMeal: vi.fn(),
        onEditMeal: vi.fn(),
        onAddTodo: vi.fn(),
        onEditTodo: vi.fn(),
      })

    fireEvent.click(screen.getByTestId('meal-reaction-meal-1'))

    await waitFor(() => {
      expect(upsertReactionMutateAsync).toHaveBeenCalledWith({
        household_id: 'hh-1',
        target_type: 'meal_plan',
        target_id: 'meal-1',
        emoji: '👍',
        user_id: 'u-1',
      })
    })
  })

  it('removes a thumbs-up from a meal when the current user already reacted', async () => {
    mockUseReactions.mockImplementation(
      (_householdId: string | undefined, targetType: string) => {
        if (targetType === 'meal_plan') {
          return {
            data: [
              {
                id: 'mr-1',
                household_id: 'hh-1',
                target_type: 'meal_plan',
                target_id: 'meal-1',
                emoji: '👍',
                user_id: 'u-1',
                created_at: '2026-04-20T12:00:00Z',
                profiles: { display_name: 'You', avatar_url: null },
              },
            ],
          }
        }
        return { data: [] }
      },
    )

    renderDay({
        date: '2026-04-20',
        household,
        currentRole: 'member',
        onBack: vi.fn(),
        onAddMeal: vi.fn(),
        onEditMeal: vi.fn(),
        onAddTodo: vi.fn(),
        onEditTodo: vi.fn(),
      })

    fireEvent.click(screen.getByTestId('meal-reaction-meal-1'))

    await waitFor(() => {
      expect(deleteReactionMutateAsync).toHaveBeenCalledWith({
        householdId: 'hh-1',
        targetType: 'meal_plan',
        targetId: 'meal-1',
        emoji: '👍',
        userId: 'u-1',
      })
    })
  })

  it('does not render meal reaction button when current user has no role', () => {
    renderDay({
        date: '2026-04-20',
        household,
        currentRole: null,
        onBack: vi.fn(),
        onAddMeal: vi.fn(),
        onEditMeal: vi.fn(),
        onAddTodo: vi.fn(),
        onEditTodo: vi.fn(),
      })

    expect(screen.queryByTestId('meal-reaction-meal-1')).toBeNull()
  })
})
