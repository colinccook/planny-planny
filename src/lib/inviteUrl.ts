/**
 * Build a fully-qualified invite URL for a given token.
 *
 * The app is served from a base path that depends on the build target:
 *   - Local dev / preview: `/`
 *   - GitHub Pages: `/planny-planny/`
 *
 * Vite exposes the configured base path as `import.meta.env.BASE_URL`, which
 * always has a trailing slash. This helper combines the current origin, that
 * base path, and the invite token into a single shareable URL.
 *
 * @param token  Invite token (the `household_invites.token` column)
 * @param origin Optional override for the URL origin (defaults to `window.location.origin`).
 *               Useful in tests / SSR-like contexts.
 * @param base   Optional override for the base path (defaults to `import.meta.env.BASE_URL`).
 *               Useful in tests.
 */
export function buildInviteUrl(
  token: string,
  origin: string = typeof window !== 'undefined' ? window.location.origin : '',
  base: string = import.meta.env.BASE_URL,
): string {
  // Normalise the base so we always have a single leading and trailing slash.
  const normalisedBase = `/${(base ?? '/').replace(/^\/+|\/+$/g, '')}/`.replace(/^\/\/$/, '/')
  return `${origin}${normalisedBase}invite/${token}`
}
