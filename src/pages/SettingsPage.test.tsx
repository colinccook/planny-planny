import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const mockSignOut = vi.fn()
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
    signOut: mockSignOut,
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
vi.mock('../components/settings/MyMemberships', () => ({
  default: () => createElement('div', { 'data-testid': 'my-memberships' }),
}))
vi.mock('../components/settings/AccessLevelsLink', () => ({
  default: () => createElement('div', { 'data-testid': 'access-levels-link' }),
}))
vi.mock('../components/settings/DeleteHousehold', () => ({
  default: () => createElement('div', { 'data-testid': 'delete-household' }),
}))
vi.mock('../components/settings/DeleteAccount', () => ({
  default: () => createElement('div', { 'data-testid': 'delete-account' }),
}))

import SettingsPage from './SettingsPage'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('SettingsPage', () => {
  it('shows loading skeleton when household data is loading', () => {
    mockUseHousehold.mockReturnValue({
      households: [],
      memberships: [],
      currentHousehold: null,
      currentRole: null,
      switchHousehold: vi.fn(),
      isLoading: true,
    })

    const { container } = render(createElement(SettingsPage), { wrapper: createWrapper() })

    expect(screen.getByText('Settings')).toBeDefined()
    const skeleton = container.querySelector('.animate-pulse')
    expect(skeleton).not.toBeNull()
  })

  it('renders all settings sections when loaded with at least one membership', () => {
    mockUseHousehold.mockReturnValue({
      households: [{ id: 'h1', name: 'My House' }],
      memberships: [{ household: { id: 'h1', name: 'My House' }, role: 'owner' }],
      currentHousehold: { id: 'h1', name: 'My House' },
      currentRole: 'owner',
      switchHousehold: vi.fn(),
      isLoading: false,
    })

    render(createElement(SettingsPage), { wrapper: createWrapper() })

    expect(screen.getByText('Settings')).toBeDefined()
    expect(screen.getByTestId('my-memberships')).toBeDefined()
    expect(screen.getByTestId('household-switcher')).toBeDefined()
    expect(screen.getByTestId('create-household-form')).toBeDefined()
    expect(screen.getByTestId('household-settings')).toBeDefined()
    expect(screen.getByTestId('day-placeholders')).toBeDefined()
    expect(screen.getByTestId('member-list')).toBeDefined()
    expect(screen.getByTestId('invite-manager')).toBeDefined()
    expect(screen.getByTestId('public-share-toggle')).toBeDefined()
    expect(screen.getByTestId('access-levels-link')).toBeDefined()
    expect(screen.getByText('test@example.com')).toBeDefined()
  })

  it('hides household-scoped sections when the user has no memberships', () => {
    mockUseHousehold.mockReturnValue({
      households: [],
      memberships: [],
      currentHousehold: null,
      currentRole: null,
      switchHousehold: vi.fn(),
      isLoading: false,
    })

    render(createElement(SettingsPage), { wrapper: createWrapper() })

    // My Memberships, Create form, and Account always render.
    expect(screen.getByTestId('my-memberships')).toBeDefined()
    expect(screen.getByTestId('create-household-form')).toBeDefined()
    expect(screen.getByText('Account')).toBeDefined()

    // Everything that requires a current household is hidden.
    expect(screen.queryByTestId('household-switcher')).toBeNull()
    expect(screen.queryByTestId('household-settings')).toBeNull()
    expect(screen.queryByTestId('day-placeholders')).toBeNull()
    expect(screen.queryByTestId('member-list')).toBeNull()
    expect(screen.queryByTestId('invite-manager')).toBeNull()
    expect(screen.queryByTestId('public-share-toggle')).toBeNull()
  })

  it('renders sign out button in the account section and triggers signOut on click', () => {
    mockUseHousehold.mockReturnValue({
      households: [{ id: 'h1', name: 'My House' }],
      memberships: [{ household: { id: 'h1', name: 'My House' }, role: 'owner' }],
      currentHousehold: { id: 'h1', name: 'My House' },
      currentRole: 'owner',
      switchHousehold: vi.fn(),
      isLoading: false,
    })

    render(createElement(SettingsPage), { wrapper: createWrapper() })

    // Verify the Account heading exists (inside the CollapsibleSection button)
    expect(screen.getByText('Account')).toBeDefined()

    // The sign out button should be visible (Account section opens by default)
    const signOutButton = screen.getByRole('button', { name: 'Sign out' })
    expect(signOutButton).toBeDefined()

    // Verify button is inside the same top-level container as the Account heading
    const accountHeading = screen.getByText('Account')
    const accountSection = accountHeading.closest('[class*="rounded-lg"]')
    expect(accountSection?.contains(signOutButton)).toBe(true)

    // Verify clicking calls signOut
    fireEvent.click(signOutButton)
    expect(mockSignOut).toHaveBeenCalledOnce()
  })

  it('does not show settings sections while loading', () => {
    mockUseHousehold.mockReturnValue({
      households: [],
      memberships: [],
      currentHousehold: null,
      currentRole: null,
      switchHousehold: vi.fn(),
      isLoading: true,
    })

    render(createElement(SettingsPage), { wrapper: createWrapper() })

    expect(screen.queryByTestId('household-switcher')).toBeNull()
  })
})
