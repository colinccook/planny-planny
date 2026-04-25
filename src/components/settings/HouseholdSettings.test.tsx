import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const mockUseHousehold = vi.fn()

vi.mock('../../hooks/useHousehold', () => ({
  useHousehold: () => mockUseHousehold(),
}))

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    }),
  },
}))

import HouseholdSettings from './HouseholdSettings'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

const mockHousehold = {
  id: 'h1',
  name: 'Test House',
  alias: 'My Place',
  default_adults: 3,
  default_children: 1,
  default_babies: 0,
  public_share_token: null,
  created_by: 'u1',
  created_at: '',
}

describe('HouseholdSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when no current household', () => {
    mockUseHousehold.mockReturnValue({
      currentHousehold: null,
      currentRole: null,
    })

    const { container } = render(createElement(HouseholdSettings), { wrapper: createWrapper() })
    expect(container.innerHTML).toBe('')
  })

  it('renders form with household values', () => {
    mockUseHousehold.mockReturnValue({
      currentHousehold: mockHousehold,
      currentRole: 'owner',
    })

    render(createElement(HouseholdSettings), { wrapper: createWrapper() })
    expect(screen.getByDisplayValue('Test House')).toBeDefined()
    expect(screen.getByDisplayValue('My Place')).toBeDefined()
    expect(screen.getByTestId('settings-adults-value').textContent).toBe('3')
    expect(screen.getByTestId('settings-children-value').textContent).toBe('1')
    expect(screen.getByTestId('settings-babies-value').textContent).toBe('0')
  })

  it('shows save button for owners', () => {
    mockUseHousehold.mockReturnValue({
      currentHousehold: mockHousehold,
      currentRole: 'owner',
    })

    render(createElement(HouseholdSettings), { wrapper: createWrapper() })
    expect(screen.getByRole('button', { name: /Save changes/i })).toBeDefined()
  })

  it('shows read-only message for voting guests', () => {
    mockUseHousehold.mockReturnValue({
      currentHousehold: mockHousehold,
      currentRole: 'voting_guest',
    })

    render(createElement(HouseholdSettings), { wrapper: createWrapper() })
    expect(screen.getByText(/don't have edit access/i)).toBeDefined()
    expect(screen.queryByRole('button', { name: /Save/i })).toBeNull()
  })

  it('disables inputs for voting guests', () => {
    mockUseHousehold.mockReturnValue({
      currentHousehold: mockHousehold,
      currentRole: 'voting_guest',
    })

    render(createElement(HouseholdSettings), { wrapper: createWrapper() })
    const nameInput = screen.getByDisplayValue('Test House') as HTMLInputElement
    expect(nameInput.disabled).toBe(true)
  })

  it('allows honoured guests to edit (they have full edit rights)', () => {
    mockUseHousehold.mockReturnValue({
      currentHousehold: mockHousehold,
      currentRole: 'honoured_guest',
    })

    render(createElement(HouseholdSettings), { wrapper: createWrapper() })
    expect(screen.getByRole('button', { name: /Save changes/i })).toBeDefined()
    const nameInput = screen.getByDisplayValue('Test House') as HTMLInputElement
    expect(nameInput.disabled).toBe(false)
  })
})
