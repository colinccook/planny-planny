import { describe, it, expect } from 'vitest'
import { buildInviteUrl } from './inviteUrl'

describe('buildInviteUrl', () => {
  const token = '38037b39-3164-4ce5-a41d-fba5039aff25'

  it('uses the GitHub Pages base path when deployed under /planny-planny/', () => {
    expect(buildInviteUrl(token, 'https://colinccook.github.io', '/planny-planny/')).toBe(
      `https://colinccook.github.io/planny-planny/invite/${token}`,
    )
  })

  it('uses just the origin when running at the root (dev / preview)', () => {
    expect(buildInviteUrl(token, 'http://localhost:5173', '/')).toBe(
      `http://localhost:5173/invite/${token}`,
    )
  })

  it('handles a base path without a trailing slash', () => {
    expect(buildInviteUrl(token, 'https://example.com', '/planny-planny')).toBe(
      `https://example.com/planny-planny/invite/${token}`,
    )
  })

  it('handles a nested base path', () => {
    expect(buildInviteUrl(token, 'https://example.com', '/apps/planny/')).toBe(
      `https://example.com/apps/planny/invite/${token}`,
    )
  })

  it('falls back to root when base is empty', () => {
    expect(buildInviteUrl(token, 'https://example.com', '')).toBe(
      `https://example.com/invite/${token}`,
    )
  })

  it('never produces a URL missing the base segment in production', () => {
    // Regression guard for the bug that produced
    //   https://colinccook.github.io/invite/<token>
    // instead of
    //   https://colinccook.github.io/planny-planny/invite/<token>
    const url = buildInviteUrl(token, 'https://colinccook.github.io', '/planny-planny/')
    expect(url).toContain('/planny-planny/invite/')
    expect(url).not.toMatch(/github\.io\/invite\//)
  })
})
