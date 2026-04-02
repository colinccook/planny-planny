import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createElement } from 'react'
import RoleBadge from './RoleBadge'

describe('RoleBadge', () => {
  it('renders the role text', () => {
    render(createElement(RoleBadge, { role: 'owner' }))
    expect(screen.getByText('owner')).toBeDefined()
  })

  it('applies emerald styles for owner', () => {
    render(createElement(RoleBadge, { role: 'owner' }))
    const badge = screen.getByText('owner')
    expect(badge.className).toContain('bg-emerald-100')
    expect(badge.className).toContain('text-emerald-800')
  })

  it('applies blue styles for member', () => {
    render(createElement(RoleBadge, { role: 'member' }))
    const badge = screen.getByText('member')
    expect(badge.className).toContain('bg-blue-100')
    expect(badge.className).toContain('text-blue-800')
  })

  it('applies gray styles for guest', () => {
    render(createElement(RoleBadge, { role: 'guest' }))
    const badge = screen.getByText('guest')
    expect(badge.className).toContain('bg-gray-100')
    expect(badge.className).toContain('text-gray-800')
  })

  it('falls back to guest styles for unknown role', () => {
    render(createElement(RoleBadge, { role: 'unknown' }))
    const badge = screen.getByText('unknown')
    expect(badge.className).toContain('bg-gray-100')
  })
})
