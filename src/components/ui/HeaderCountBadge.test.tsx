import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { createElement } from 'react'

import HeaderCountBadge from './HeaderCountBadge'

describe('HeaderCountBadge', () => {
  it('renders the icon and count', () => {
    render(
      createElement(HeaderCountBadge, {
        icon: '🔥',
        count: 3,
        ariaLabel: '3 days streak',
      }),
    )
    expect(screen.getByLabelText('3 days streak')).toBeDefined()
    expect(screen.getByLabelText('3 days streak').textContent).toContain('3')
  })

  it('hides itself when count is 0 (default)', () => {
    const { container } = render(
      createElement(HeaderCountBadge, {
        icon: '💡',
        count: 0,
        ariaLabel: 'no ideas',
      }),
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders even at 0 when hideWhenZero is false', () => {
    render(
      createElement(HeaderCountBadge, {
        icon: '🔥',
        count: 0,
        ariaLabel: '0 day streak',
        hideWhenZero: false,
      }),
    )
    expect(screen.getByLabelText('0 day streak').textContent).toContain('0')
  })

  it('renders as a button when onClick is provided', () => {
    const onClick = vi.fn()
    render(
      createElement(HeaderCountBadge, {
        icon: '✅',
        count: 2,
        ariaLabel: '2 todos',
        onClick,
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: '2 todos' }))
    expect(onClick).toHaveBeenCalledOnce()
  })
})
