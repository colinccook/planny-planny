/**
 * Build a fully-qualified URL into the running app, prefixed with the app's
 * configured base path.
 *
 * The app may be served from a non-root base path depending on the deploy
 * target:
 *   - Local dev / preview: `/`
 *   - GitHub Pages:        `/planny-planny/`
 *   - Custom apex domain:  `/`
 *   - Custom subpath:      `/whatever/`
 *
 * Vite exposes the configured base as `import.meta.env.BASE_URL` (always with
 * a trailing slash). This helper combines the current origin, that base, and
 * the supplied app-relative path into a single absolute URL — so any user-
 * facing share link works regardless of where the app is hosted.
 *
 * @param path   App-relative path (e.g. `invite/<token>` or `shared/<token>`).
 *               A leading slash is tolerated and stripped.
 * @param origin Optional override for the URL origin (defaults to `window.location.origin`).
 * @param base   Optional override for the base path (defaults to `import.meta.env.BASE_URL`).
 */
export function buildAppUrl(
  path: string,
  origin: string = typeof window !== 'undefined' ? window.location.origin : '',
  base: string = import.meta.env.BASE_URL,
): string {
  // Normalise the base so we always have exactly one leading and trailing slash.
  const normalisedBase = `/${(base ?? '/').replace(/^\/+|\/+$/g, '')}/`.replace(/^\/\/$/, '/')
  // Strip any leading slashes from path so we don't double up.
  const normalisedPath = (path ?? '').replace(/^\/+/, '')
  return `${origin}${normalisedBase}${normalisedPath}`
}

/** Build a fully-qualified invite URL for a given token. */
export function buildInviteUrl(
  token: string,
  origin?: string,
  base?: string,
): string {
  return buildAppUrl(`invite/${token}`, origin, base)
}

/** Build a fully-qualified public-share URL for a given token. */
export function buildShareUrl(
  token: string,
  origin?: string,
  base?: string,
): string {
  return buildAppUrl(`shared/${token}`, origin, base)
}
