// @Households #UnitTesting #Frontend
import { createElement, type ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HouseholdProvider, useHousehold } from './useHousehold'
import type { Database } from '../types/database'

const state = vi.hoisted(() => ({
  selected: null as string | null,
  preferencesLoaded: true,
  membershipsLoading: false,
  setPreferences: vi.fn(),
}))

const home = { id: 'home', name: 'Home' } as Database['public']['Tables']['households']['Row']
const beach = { id: 'beach', name: 'Beach' } as Database['public']['Tables']['households']['Row']

vi.mock('./useAuth', () => ({ useAuth: () => ({ user: { id: 'user' } }) }))
vi.mock('./useMemberships', () => ({
  useMemberships: () => ({
    households: [home, beach],
    memberships: [home, beach].map((household) => ({ household, role: 'owner' })),
    isLoading: state.membershipsLoading,
  }),
}))
vi.mock('./useUserPreferences', () => ({
  useUserPreferences: () => ({
    preferences: { lastHouseholdId: state.selected },
    isSuccess: state.preferencesLoaded,
    setPreferences: state.setPreferences,
  }),
}))
vi.mock('./useHouseholdRealtime', () => ({ useHouseholdRealtime: vi.fn() }))
vi.mock('./useSounds', () => ({ useSounds: () => ({ play: vi.fn() }) }))

function wrapper({ children }: { children: ReactNode }) {
  return createElement(HouseholdProvider, null, children)
}

describe('shared active household selection', () => {
  beforeEach(() => {
    localStorage.clear()
    state.selected = null
    state.preferencesLoaded = true
    state.membershipsLoading = false
    state.setPreferences.mockReset()
  })

  it('shares an automatically selected household with the server', () => {
    const { result } = renderHook(() => useHousehold(), { wrapper })
    expect(result.current.currentHousehold?.id).toBe(home.id)
    expect(state.setPreferences).toHaveBeenCalledWith(
      { lastHouseholdId: home.id }, { onlyIfNoHousehold: true },
    )
  })

  it('waits for preferences before sharing a fallback household', () => {
    state.preferencesLoaded = false
    const { rerender, result } = renderHook(() => useHousehold(), { wrapper })
    expect(state.setPreferences).not.toHaveBeenCalled()
    state.selected = beach.id
    state.preferencesLoaded = true
    rerender()
    expect(result.current.currentHousehold?.id).toBe(beach.id)
    expect(state.setPreferences).not.toHaveBeenCalled()
  })

  it('waits for memberships before saving a fallback', () => {
    state.membershipsLoading = true
    const { rerender } = renderHook(() => useHousehold(), { wrapper })
    expect(state.setPreferences).not.toHaveBeenCalled()
    state.membershipsLoading = false
    rerender()
    expect(state.setPreferences).toHaveBeenCalledOnce()
  })

  it('follows a remote change even after switching in this session', () => {
    state.selected = home.id
    const { result, rerender } = renderHook(() => useHousehold(), { wrapper })
    act(() => result.current.switchHousehold(beach.id))
    expect(state.setPreferences).toHaveBeenCalledWith({ lastHouseholdId: beach.id })
    state.selected = beach.id
    rerender()
    expect(result.current.currentHousehold?.id).toBe(beach.id)
    state.selected = home.id
    rerender()
    expect(result.current.currentHousehold?.id).toBe(home.id)
    expect(localStorage.getItem('planny-planny:last-household:user')).toBe(home.id)
  })

  it('does not repeatedly save a fallback when a write fails', () => {
    const { rerender } = renderHook(() => useHousehold(), { wrapper })
    rerender()
    expect(state.setPreferences).toHaveBeenCalledOnce()
  })

  it('does not overwrite a remote selection missing from cached memberships', () => {
    state.selected = 'new-household'
    const { result } = renderHook(() => useHousehold(), { wrapper })
    expect(result.current.currentHousehold?.id).toBe(home.id)
    expect(state.setPreferences).not.toHaveBeenCalled()
  })
})
