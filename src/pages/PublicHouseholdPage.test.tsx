import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

const mockFrom = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

import PublicHouseholdPage from './PublicHouseholdPage'

function createWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(
      MemoryRouter,
      { initialEntries: ['/shared/test-token'] },
      createElement(Routes, null,
        createElement(Route, { path: '/shared/:token', element: children })
      )
    )
  }
}

describe('PublicHouseholdPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows not found when token is invalid', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
        }),
      }),
    })

    render(createElement(PublicHouseholdPage), { wrapper: createWrapper() })
    const errorMsg = await screen.findByText(/Shared plan not found/)
    expect(errorMsg).toBeDefined()
  })

  it('shows household name and meal plans when valid', async () => {
    const mockHousehold = {
      id: 'h1',
      name: 'Smith Family',
      alias: null,
      default_adults: 2,
      default_children: 0,
      public_share_token: 'test-token',
      created_by: 'u1',
      created_at: '',
    }

    const mockPlans = [
      { id: 'mp1', household_id: 'h1', date: '2025-12-25', title: 'Christmas Dinner', description: 'Turkey and stuffing', created_by: 'u1', created_at: '', updated_at: '' },
    ]

    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // households query
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockHousehold, error: null }),
            }),
          }),
        }
      }
      // meal_plans query
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: mockPlans, error: null }),
              }),
            }),
          }),
        }),
      }
    })

    render(createElement(PublicHouseholdPage), { wrapper: createWrapper() })
    const name = await screen.findByText('Smith Family')
    expect(name).toBeDefined()
    const plan = await screen.findByText('Christmas Dinner')
    expect(plan).toBeDefined()
    expect(screen.getByText('Turkey and stuffing')).toBeDefined()
  })
})
