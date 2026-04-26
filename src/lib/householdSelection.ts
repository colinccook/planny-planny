/**
 * Pure selection logic for which household should be active for a user.
 *
 * Rules (in order):
 *   1. If a previously stored household id is still one of the user's
 *      memberships, use that one — this is what makes "remember my last
 *      household when I log in again" work.
 *   2. Otherwise, fall back to the first available membership. This is the
 *      "I was kicked / left / the household was deleted" path.
 *   3. If the user has no memberships, return null.
 *
 * The function is intentionally agnostic about how the stored id is
 * persisted (localStorage in the browser, anything in tests) so it can be
 * unit-tested and BDD-tested without a DOM.
 */
export function pickInitialHousehold<T extends { id: string }>(
  storedId: string | null | undefined,
  households: readonly T[],
): T | null {
  if (households.length === 0) return null
  if (storedId) {
    const match = households.find((h) => h.id === storedId)
    if (match) return match
  }
  return households[0]
}

/**
 * Build the localStorage key used to remember the active household for a
 * given user. Scoped per-user so that switching accounts on a shared
 * device doesn't surface another user's household id.
 */
export function lastHouseholdStorageKey(userId: string): string {
  return `planny-planny:last-household:${userId}`
}
