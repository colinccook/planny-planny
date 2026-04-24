import { describe, it, expect } from 'vitest'
import { buildAppUrl, buildInviteUrl, buildShareUrl } from './appUrl'

describe('buildAppUrl', () => {
  it('combines origin, base, and path', () => {
    expect(buildAppUrl('invite/abc', 'https://example.com', '/planny-planny/')).toBe(
      'https://example.com/planny-planny/invite/abc',
    )
  })

  it('works at the apex / custom-domain root', () => {
    // e.g. if plannyplanny.app is purchased and the app is served at the root
    expect(buildAppUrl('invite/abc', 'https://plannyplanny.app', '/')).toBe(
      'https://plannyplanny.app/invite/abc',
    )
  })

  it('works under a nested base path', () => {
    expect(buildAppUrl('invite/abc', 'https://example.com', '/apps/planny/')).toBe(
      'https://example.com/apps/planny/invite/abc',
    )
  })

  it('tolerates a base without a trailing slash', () => {
    expect(buildAppUrl('invite/abc', 'https://example.com', '/planny-planny')).toBe(
      'https://example.com/planny-planny/invite/abc',
    )
  })

  it('tolerates a leading slash on the path', () => {
    expect(buildAppUrl('/invite/abc', 'https://example.com', '/planny-planny/')).toBe(
      'https://example.com/planny-planny/invite/abc',
    )
  })

  it('falls back to root when base is empty', () => {
    expect(buildAppUrl('invite/abc', 'https://example.com', '')).toBe(
      'https://example.com/invite/abc',
    )
  })
})

describe('buildInviteUrl', () => {
  const token = '38037b39-3164-4ce5-a41d-fba5039aff25'

  it('uses the GitHub Pages base path when deployed under /planny-planny/', () => {
    expect(buildInviteUrl(token, 'https://colinccook.github.io', '/planny-planny/')).toBe(
      `https://colinccook.github.io/planny-planny/invite/${token}`,
    )
  })

  it('uses just the origin when running at the root (dev / apex domain)', () => {
    expect(buildInviteUrl(token, 'http://localhost:5173', '/')).toBe(
      `http://localhost:5173/invite/${token}`,
    )
    expect(buildInviteUrl(token, 'https://plannyplanny.app', '/')).toBe(
      `https://plannyplanny.app/invite/${token}`,
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

describe('buildShareUrl', () => {
  const token = 'public-share-token-1234'

  it('uses the GitHub Pages base path when deployed under /planny-planny/', () => {
    expect(buildShareUrl(token, 'https://colinccook.github.io', '/planny-planny/')).toBe(
      `https://colinccook.github.io/planny-planny/shared/${token}`,
    )
  })

  it('uses just the origin at an apex domain', () => {
    expect(buildShareUrl(token, 'https://plannyplanny.app', '/')).toBe(
      `https://plannyplanny.app/shared/${token}`,
    )
  })

  it('never produces a URL missing the base segment in production', () => {
    const url = buildShareUrl(token, 'https://colinccook.github.io', '/planny-planny/')
    expect(url).toContain('/planny-planny/shared/')
    expect(url).not.toMatch(/github\.io\/shared\//)
  })
})
