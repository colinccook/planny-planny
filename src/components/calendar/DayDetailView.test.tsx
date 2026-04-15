import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'

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

const mockUseAuth = vi.fn()

vi.mock('../../hooks/useAuth', () => ({
  useAuth: (...args: unknown[]) => mockUseAuth(...args),
}))

vi.mock('./MealPromptGenerator', () => ({
  default: () => null,
}))

vi.mock('../ui/FullScreenView', () => ({
  default: ({ children }: { children?: ReactNode }) =>
    createElement('div', null, children),
}))

import DayDetailView from './DayDetailView'

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
    mockUseReactions.mockReturnValue({
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
    })
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
    render(
      createElement(DayDetailView, {
        date: '2026-04-20',
        household,
        currentRole: 'member',
        onBack: vi.fn(),
        onAddMeal: vi.fn(),
        onEditMeal: vi.fn(),
      }),
    )

    expect(screen.getByText('Events')).toBeDefined()
    expect(screen.getByText('Ideas')).toBeDefined()
    expect(screen.getByText('Meal plans')).toBeDefined()
    expect(screen.getByText('Burgers')).toBeDefined()
    expect(screen.getByText('👍 1')).toBeDefined()
  })

  it('adds a meal idea from the tray', async () => {
    render(
      createElement(DayDetailView, {
        date: '2026-04-20',
        household,
        currentRole: 'member',
        onBack: vi.fn(),
        onAddMeal: vi.fn(),
        onEditMeal: vi.fn(),
      }),
    )

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

  it('shows reactors and supports deleting an idea from idea detail tray', async () => {
    render(
      createElement(DayDetailView, {
        date: '2026-04-20',
        household,
        currentRole: 'member',
        onBack: vi.fn(),
        onAddMeal: vi.fn(),
        onEditMeal: vi.fn(),
      }),
    )

    fireEvent.click(screen.getByTestId('idea-card-idea-1'))

    expect(screen.getByText('Thumbed up by')).toBeDefined()
    expect(screen.getByText('Casey')).toBeDefined()

    fireEvent.click(screen.getByTestId('delete-idea-button'))

    await waitFor(() => {
      expect(deleteIdeaMutateAsync).toHaveBeenCalledWith({
        id: 'idea-1',
        householdId: 'hh-1',
      })
    })
  })

  it('opens reaction picker and adds a thumbs-up reaction', async () => {
    render(
      createElement(DayDetailView, {
        date: '2026-04-20',
        household,
        currentRole: 'member',
        onBack: vi.fn(),
        onAddMeal: vi.fn(),
        onEditMeal: vi.fn(),
      }),
    )

    fireEvent.click(screen.getByTestId('idea-card-idea-1'))
    fireEvent.click(screen.getByTestId('open-react-to-idea-button'))
    fireEvent.click(screen.getByTestId('thumbs-up-reaction-button'))

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
})
