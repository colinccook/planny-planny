import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const mockUseHousehold = vi.fn()

vi.mock('../hooks/useHousehold', () => ({
  useHousehold: () => mockUseHousehold(),
}))

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { email: 'test@example.com' },
    session: null,
    loading: false,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
}))

// Mock child components to isolate SettingsPage logic
vi.mock('../components/settings/HouseholdSwitcher', () => ({
  default: () => createElement('div', { 'data-testid': 'household-switcher' }),
}))
vi.mock('../components/settings/CreateHouseholdForm', () => ({
  default: () => createElement('div', { 'data-testid': 'create-household-form' }),
}))
vi.mock('../components/settings/HouseholdSettings', () => ({
  default: () => createElement('div', { 'data-testid': 'household-settings' }),
}))
vi.mock('../components/settings/DayPlaceholders', () => ({
  default: () => createElement('div', { 'data-testid': 'day-placeholders' }),
}))
vi.mock('../components/settings/MemberList', () => ({
  default: () => createElement('div', { 'data-testid': 'member-list' }),
}))
vi.mock('../components/settings/InviteManager', () => ({
  default: () => createElement('div', { 'data-testid': 'invite-manager' }),
}))
vi.mock('../components/settings/PublicShareToggle', () => ({
  default: () => createElement('div', { 'data-testid': 'public-share-toggle' }),
}))

import SettingsPage from './SettingsPage'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('SettingsPage', () => {
  it('shows loading spinner when household data is loading', () => {
    mockUseHousehold.mockReturnValue({
      households: [],
      currentHousehold: null,
      currentRole: null,
      switchHousehold: vi.fn(),
      isLoading: true,
    })

    const { container } = render(createElement(SettingsPage), { wrapper: createWrapper() })

    expect(screen.getByText('Settings')).toBeDefined()
    const spinner = container.querySelector('.animate-spin')
    expect(spinner).not.toBeNull()
  })

  it('renders all settings sections when loaded', () => {
    mockUseHousehold.mockReturnValue({
      households: [{ id: 'h1', name: 'My House' }],
      currentHousehold: { id: 'h1', name: 'My House' },
      currentRole: 'owner',
      switchHousehold: vi.fn(),
      isLoading: false,
    })

    render(createElement(SettingsPage), { wrapper: createWrapper() })

    expect(screen.getByText('Settings')).toBeDefined()
    expect(screen.getByTestId('household-switcher')).toBeDefined()
    expect(screen.getByTestId('create-household-form')).toBeDefined()
    expect(screen.getByTestId('household-settings')).toBeDefined()
    expect(screen.getByTestId('day-placeholders')).toBeDefined()
    expect(screen.getByTestId('member-list')).toBeDefined()
    expect(screen.getByTestId('invite-manager')).toBeDefined()
    expect(screen.getByTestId('public-share-toggle')).toBeDefined()
    expect(screen.getByText('test@example.com')).toBeDefined()
  })

  it('does not show settings sections while loading', () => {
    mockUseHousehold.mockReturnValue({
      households: [],
      currentHousehold: null,
      currentRole: null,
      switchHousehold: vi.fn(),
      isLoading: true,
    })

    render(createElement(SettingsPage), { wrapper: createWrapper() })

    expect(screen.queryByTestId('household-switcher')).toBeNull()
  })
})
