import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createElement, useEffect } from 'react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../../hooks/useHousehold', () => ({
  useHousehold: () => ({
    memberships: [
      { household: { id: 'h1', name: 'Test House' }, role: 'owner' },
    ],
    isLoading: false,
  }),
}))

vi.mock('../../hooks/useCalendarDirection', () => ({
  useCalendarDirection: () => ({ toggleDirection: vi.fn() }),
}))

import TabBar from './TabBar'
import {
  HeaderOverrideProvider,
  useHeaderOverride,
} from '../../hooks/useHeaderOverride'

const stubBackHandler = () => {
  /* tab bar tests don't care what the back button does */
}

/**
 * Mounts FakeOverride to register/clear a header override on demand by
 * toggling its `active` prop. Mirrors how real "drilled-in" views like
 * FullScreenView interact with the override context.
 */
function FakeOverride({ active }: { active: boolean }) {
  const { setOverride, clearOverride } = useHeaderOverride()
  useEffect(() => {
    if (active) {
      setOverride({ title: 'Wednesday', onBack: stubBackHandler })
    } else {
      clearOverride()
    }
  }, [active, setOverride, clearOverride])
  return null
}

function renderTabBarWithOverride(active: boolean) {
  return render(
    createElement(
      MemoryRouter,
      { initialEntries: ['/calendar'] },
      createElement(
        HeaderOverrideProvider,
        null,
        createElement(FakeOverride, { active }),
        createElement(TabBar),
      ),
    ),
  )
}

function renderTogglable(initialActive: boolean) {
  const ui = (a: boolean) =>
    createElement(
      MemoryRouter,
      { initialEntries: ['/calendar'] },
      createElement(
        HeaderOverrideProvider,
        null,
        createElement(FakeOverride, { active: a }),
        createElement(TabBar),
      ),
    )
  const utils = render(ui(initialActive))
  return {
    ...utils,
    setActive: (v: boolean) => utils.rerender(ui(v)),
  }
}

function getNav(): HTMLElement {
  const inner = screen.getByTestId('tab-bar')
  const nav = inner.parentElement
  if (!nav) throw new Error('tab-bar has no parent nav')
  return nav
}

describe('TabBar visibility', () => {
  it('is visible (translated to its resting position) when no header override is active', () => {
    renderTabBarWithOverride(false)

    const nav = getNav()
    expect(nav.getAttribute('data-hidden')).toBe('false')
    expect(nav.className).toContain('translate-y-0')
    expect(nav.className).not.toContain('translate-y-full')
    expect(nav.getAttribute('aria-hidden')).toBe('false')
  })

  it('slides down (translate-y-full) when a header override is registered', () => {
    renderTabBarWithOverride(true)

    const nav = getNav()
    expect(nav.getAttribute('data-hidden')).toBe('true')
    expect(nav.className).toContain('translate-y-full')
    expect(nav.getAttribute('aria-hidden')).toBe('true')
  })

  it('slides back up when the header override is cleared', () => {
    const { setActive } = renderTogglable(true)
    expect(getNav().getAttribute('data-hidden')).toBe('true')

    setActive(false)

    const nav = getNav()
    expect(nav.getAttribute('data-hidden')).toBe('false')
    expect(nav.className).toContain('translate-y-0')
  })

  it('keeps a transition-transform class so the show/hide animates', () => {
    renderTabBarWithOverride(false)
    expect(getNav().className).toContain('transition-transform')
  })

  it('makes hidden tab links non-interactive', () => {
    renderTabBarWithOverride(true)

    const calendarLink = screen.getByTestId('tab-calendar')
    expect(calendarLink.getAttribute('tabindex')).toBe('-1')
    expect(calendarLink.className).toContain('pointer-events-none')
  })
})
