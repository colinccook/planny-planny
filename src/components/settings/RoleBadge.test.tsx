import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createElement } from 'react'
import RoleBadge from './RoleBadge'

describe('RoleBadge', () => {
  it('renders the friendly role label for owner', () => {
    render(createElement(RoleBadge, { role: 'owner' }))
    expect(screen.getByText('Owner')).toBeDefined()
  })

  it('applies emerald styles for owner', () => {
    render(createElement(RoleBadge, { role: 'owner' }))
    const badge = screen.getByText('Owner')
    expect(badge.className).toContain('bg-emerald-100')
    expect(badge.className).toContain('text-emerald-800')
  })

  it('applies blue styles for member', () => {
    render(createElement(RoleBadge, { role: 'member' }))
    const badge = screen.getByText('Member')
    expect(badge.className).toContain('bg-blue-100')
    expect(badge.className).toContain('text-blue-800')
  })

  it('applies amber styles for honoured guest', () => {
    render(createElement(RoleBadge, { role: 'honoured_guest' }))
    const badge = screen.getByText('Honoured Guest')
    expect(badge.className).toContain('bg-amber-100')
    expect(badge.className).toContain('text-amber-800')
  })

  it('applies purple styles for voting guest', () => {
    render(createElement(RoleBadge, { role: 'voting_guest' }))
    const badge = screen.getByText('Voting Guest')
    expect(badge.className).toContain('bg-purple-100')
    expect(badge.className).toContain('text-purple-800')
  })

  it('falls back to neutral styles for unknown role', () => {
    render(createElement(RoleBadge, { role: 'unknown' }))
    const badge = screen.getByText('unknown')
    expect(badge.className).toContain('bg-gray-100')
  })
})
