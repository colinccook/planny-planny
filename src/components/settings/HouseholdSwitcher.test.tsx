import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const mockSwitchHousehold = vi.fn()
const mockUseHousehold = vi.fn()

vi.mock('../../hooks/useHousehold', () => ({
  useHousehold: () => mockUseHousehold(),
}))

import HouseholdSwitcher from './HouseholdSwitcher'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('HouseholdSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading skeleton when isLoading', () => {
    mockUseHousehold.mockReturnValue({
      households: [],
      currentHousehold: null,
      currentRole: null,
      switchHousehold: mockSwitchHousehold,
      isLoading: true,
    })

    const { container } = render(createElement(HouseholdSwitcher), { wrapper: createWrapper() })
    expect(container.querySelector('.animate-pulse')).not.toBeNull()
  })

  it('shows empty message when no households', () => {
    mockUseHousehold.mockReturnValue({
      households: [],
      currentHousehold: null,
      currentRole: null,
      switchHousehold: mockSwitchHousehold,
      isLoading: false,
    })

    render(createElement(HouseholdSwitcher), { wrapper: createWrapper() })
    expect(screen.getByText(/No households yet/)).toBeDefined()
  })

  it('renders select with household options', () => {
    const households = [
      { id: 'h1', name: 'House 1', alias: null, default_adults: 2, default_children: 0, default_babies: 0, public_share_token: null, created_by: 'u1', created_at: '' },
      { id: 'h2', name: 'House 2', alias: 'My Place', default_adults: 2, default_children: 0, default_babies: 0, public_share_token: null, created_by: 'u1', created_at: '' },
    ]

    mockUseHousehold.mockReturnValue({
      households,
      currentHousehold: households[0],
      currentRole: 'owner',
      switchHousehold: mockSwitchHousehold,
      isLoading: false,
    })

    render(createElement(HouseholdSwitcher), { wrapper: createWrapper() })
    const select = screen.getByLabelText('Current Household') as HTMLSelectElement
    expect(select).toBeDefined()
    expect(select.value).toBe('h1')

    // House 2 should show alias
    const options = select.querySelectorAll('option')
    expect(options[0].textContent).toBe('House 1')
    expect(options[1].textContent).toBe('My Place')
  })

  it('displays role badge for current household', () => {
    const households = [
      { id: 'h1', name: 'House 1', alias: null, default_adults: 2, default_children: 0, default_babies: 0, public_share_token: null, created_by: 'u1', created_at: '' },
    ]

    mockUseHousehold.mockReturnValue({
      households,
      currentHousehold: households[0],
      currentRole: 'owner',
      switchHousehold: mockSwitchHousehold,
      isLoading: false,
    })

    render(createElement(HouseholdSwitcher), { wrapper: createWrapper() })
    expect(screen.getByText('Owner')).toBeDefined()
  })
})
