import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'new-h', name: 'Test', alias: null, default_adults: 2, default_children: 0, default_babies: 0, public_share_token: null, created_by: 'u1', created_at: '' },
            error: null,
          }),
        }),
      }),
    }),
  },
}))

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1' }, session: null, loading: false }),
}))

const mockSwitchHousehold = vi.fn()

vi.mock('../../hooks/useHousehold', () => ({
  useHousehold: () => ({
    households: [],
    currentHousehold: null,
    currentRole: null,
    switchHousehold: mockSwitchHousehold,
    isLoading: false,
  }),
}))

import CreateHouseholdForm from './CreateHouseholdForm'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('CreateHouseholdForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders collapsed by default', () => {
    render(createElement(CreateHouseholdForm), { wrapper: createWrapper() })
    expect(screen.getByText('Create new household')).toBeDefined()
    expect(screen.queryByLabelText(/Name/)).toBeNull()
  })

  it('expands when clicked', () => {
    render(createElement(CreateHouseholdForm), { wrapper: createWrapper() })
    fireEvent.click(screen.getByText('Create new household'))
    expect(screen.getByLabelText(/Name/)).toBeDefined()
    expect(screen.getByLabelText(/Alias/)).toBeDefined()
  })

  it('shows all form fields when expanded', () => {
    render(createElement(CreateHouseholdForm), { wrapper: createWrapper() })
    fireEvent.click(screen.getByText('Create new household'))
    expect(screen.getByLabelText(/Name/)).toBeDefined()
    expect(screen.getByLabelText(/Alias/)).toBeDefined()
    expect(screen.getByLabelText(/Default adults/)).toBeDefined()
    expect(screen.getByLabelText(/Default children/)).toBeDefined()
    expect(screen.getByLabelText(/Default babies/)).toBeDefined()
    expect(screen.getByRole('button', { name: /Create household/i })).toBeDefined()
  })

  it('submit button is disabled when name is empty', () => {
    render(createElement(CreateHouseholdForm), { wrapper: createWrapper() })
    fireEvent.click(screen.getByText('Create new household'))
    const submitButton = screen.getByRole('button', { name: /Create household/i })
    expect(submitButton).toHaveProperty('disabled', true)
  })

  it('has correct default values for adults, children, and babies', () => {
    render(createElement(CreateHouseholdForm), { wrapper: createWrapper() })
    fireEvent.click(screen.getByText('Create new household'))
    const adultsInput = screen.getByLabelText(/Default adults/) as HTMLInputElement
    const childrenInput = screen.getByLabelText(/Default children/) as HTMLInputElement
    const babiesInput = screen.getByLabelText(/Default babies/) as HTMLInputElement
    expect(adultsInput.value).toBe('2')
    expect(childrenInput.value).toBe('0')
    expect(babiesInput.value).toBe('0')
  })
})
