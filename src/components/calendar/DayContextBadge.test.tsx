import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createElement } from 'react'

import DayContextBadge from './DayContextBadge'

describe('DayContextBadge', () => {
  it('renders default people counts', () => {
    render(
      createElement(DayContextBadge, {
        defaultAdults: 2,
        defaultChildren: 1,
        defaultBabies: 0,
        contexts: [],
        onEdit: vi.fn(),
      })
    )

    expect(screen.getByText('2')).toBeDefined()
    expect(screen.getByText('1')).toBeDefined()
  })

  it('adds extra people from contexts', () => {
    const contexts = [
      {
        id: 'ctx1',
        household_id: 'h1',
        date: '2024-06-15',
        end_date: null,
        event_name: null,
        extra_adults: 2,
        extra_children: 3,
        extra_babies: 0,
        created_at: '',
      },
    ]

    render(
      createElement(DayContextBadge, {
        defaultAdults: 2,
        defaultChildren: 1,
        defaultBabies: 0,
        contexts,
        onEdit: vi.fn(),
      })
    )

    // 2 + 2 = 4 adults, 1 + 3 = 4 children — both show "4"
    const fours = screen.getAllByText('4')
    expect(fours.length).toBeGreaterThanOrEqual(2)
  })

  it('renders event names', () => {
    const contexts = [
      {
        id: 'ctx1',
        household_id: 'h1',
        date: '2024-06-15',
        end_date: null,
        event_name: 'Mum visiting',
        extra_adults: 1,
        extra_children: 0,
        extra_babies: 0,
        created_at: '',
      },
      {
        id: 'ctx2',
        household_id: 'h1',
        date: '2024-06-15',
        end_date: null,
        event_name: "Colin's birthday",
        extra_adults: 0,
        extra_children: 0,
        extra_babies: 0,
        created_at: '',
      },
    ]

    render(
      createElement(DayContextBadge, {
        defaultAdults: 2,
        defaultChildren: 0,
        defaultBabies: 0,
        contexts,
        onEdit: vi.fn(),
      })
    )

    expect(screen.getByText('Mum visiting')).toBeDefined()
    expect(screen.getByText("Colin's birthday")).toBeDefined()
  })

  it('hides children count when zero', () => {
    render(
      createElement(DayContextBadge, {
        defaultAdults: 2,
        defaultChildren: 0,
        defaultBabies: 0,
        contexts: [],
        onEdit: vi.fn(),
      })
    )

    expect(screen.getByText('2')).toBeDefined()
    expect(screen.queryByLabelText('children')).toBeNull()
  })

  it('hides babies count when zero', () => {
    render(
      createElement(DayContextBadge, {
        defaultAdults: 2,
        defaultChildren: 0,
        defaultBabies: 0,
        contexts: [],
        onEdit: vi.fn(),
      })
    )

    expect(screen.queryByLabelText('babies')).toBeNull()
  })

  it('shows babies emoji when babies count is positive', () => {
    render(
      createElement(DayContextBadge, {
        defaultAdults: 2,
        defaultChildren: 0,
        defaultBabies: 1,
        contexts: [],
        onEdit: vi.fn(),
      })
    )

    expect(screen.getByLabelText('babies')).toBeDefined()
    expect(screen.getByText('1')).toBeDefined()
  })

  it('floors negative totals at zero', () => {
    const contexts = [
      {
        id: 'ctx1',
        household_id: 'h1',
        date: '2024-06-15',
        end_date: null,
        event_name: 'Partner away',
        extra_adults: -100,
        extra_children: 0,
        extra_babies: 0,
        created_at: '',
      },
    ]

    render(
      createElement(DayContextBadge, {
        defaultAdults: 2,
        defaultChildren: 1,
        defaultBabies: 0,
        contexts,
        onEdit: vi.fn(),
      })
    )

    // Adults total: 2 + (-100) = -98 → clamped to 0 → hidden
    expect(screen.queryByLabelText('adults')).toBeNull()
    // Children unaffected
    expect(screen.getByText('1')).toBeDefined()
  })
})
