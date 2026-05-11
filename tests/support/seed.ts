import { getAdminClient } from './supabaseAdmin'

/**
 * Helpers for seeding authenticated users + households into the local
 * Supabase instance for integration tests, and for tearing them down
 * again.
 *
 * Why this exists: the only way to drive a real, signed-in flow against
 * the React app from Playwright is to create real auth users via the
 * service-role admin API. RLS still applies once the test user signs in
 * via the UI, so this only bypasses RLS for the seeding/cleanup itself.
 */

export type SeedRole = 'owner' | 'member' | 'guest'

export interface SeedHouseholdSpec {
  /** Display name for the household; assertions in tests match this. */
  name: string
  /** Role the primary user should have in this household. */
  role: SeedRole
}

export interface SeedUserOptions {
  /**
   * Stable display name. Defaults to "Test User <random>". Visible in
   * the UI as the auto-created personal household name.
   */
  displayName?: string
  /**
   * The households the primary user should be in once seeding finishes.
   * Each entry creates exactly one new household (no leftover personal
   * household — see implementation note below).
   */
  households: SeedHouseholdSpec[]
}

export interface SeededUser {
  userId: string
  email: string
  password: string
  displayName: string
  /**
   * One entry per `SeedHouseholdSpec`, in the same order.
   */
  households: { id: string; name: string; role: SeedRole }[]
  /**
   * Auxiliary user IDs created so the primary user could join a
   * household at a non-owner role (every household needs at least one
   * owner). Cleanup deletes these too.
   */
  auxUserIds: string[]
}

function uniqueSuffix(): string {
  // Short, URL-safe, collision-resistant enough for parallel tests.
  return Math.random().toString(36).slice(2, 10)
}

/**
 * Create a fresh user with their email pre-confirmed (so the UI can
 * sign them straight in with email + password — no inbox dance).
 *
 * Returns the new user id, the email/password used, and the display
 * name (so callers can reuse it for assertions / aux owners).
 */
async function createConfirmedUser(displayName: string): Promise<{
  userId: string
  email: string
  password: string
  displayName: string
}> {
  const admin = getAdminClient()
  const suffix = uniqueSuffix()
  const email = `test-${suffix}@example.test`
  const password = `Password!${suffix}`

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  })
  if (error || !data.user) {
    throw new Error(
      `Failed to create test user (${email}): ${error?.message ?? 'unknown'}`,
    )
  }

  const userId = data.user.id

  // Belt and braces: the on_auth_user_created trigger inserts the
  // profiles row, but if a future migration changes that we still want
  // the test to work. `upsert` keeps it idempotent.
  const { error: profileErr } = await admin
    .from('profiles')
    .upsert({ id: userId, display_name: displayName }, { onConflict: 'id' })
  if (profileErr) {
    throw new Error(
      `Failed to upsert profile for ${email}: ${profileErr.message}`,
    )
  }

  return { userId, email, password, displayName }
}

/**
 * Find the household auto-created for a freshly-seeded user by the
 * `on_profile_created` trigger. Returns `null` if the trigger is gone
 * or hasn't fired yet (the seed helper falls back to creating a fresh
 * one in that case).
 */
async function findAutoCreatedHousehold(
  userId: string,
): Promise<{ id: string } | null> {
  const admin = getAdminClient()
  const { data, error } = await admin
    .from('household_members')
    .select('household_id, role')
    .eq('user_id', userId)
  if (error) {
    throw new Error(`Failed to list memberships: ${error.message}`)
  }
  const owned = (data ?? []).find((m) => m.role === 'owner')
  return owned ? { id: owned.household_id } : null
}

/**
 * Public API — seed a primary user with the requested household
 * configuration. Pairs with `cleanupSeededUser`.
 *
 * Implementation note: the `on_profile_created` trigger gives every
 * new user one auto-created household where they're the owner. Rather
 * than fight the `prevent_last_owner_removal` trigger to delete it,
 * we reuse it for the first owner-role spec (renaming it). Subsequent
 * owner specs get fresh households via direct insert. Non-owner specs
 * spin up a throwaway aux owner so the household has a valid owner.
 */
export async function seedUserWithHouseholds(
  opts: SeedUserOptions,
): Promise<SeededUser> {
  const admin = getAdminClient()
  const displayName = opts.displayName ?? `Test User ${uniqueSuffix()}`

  // Make the implementation contract explicit: we rely on having at
  // least one owner-role household to absorb the auto-created one.
  // Lifting this restriction would mean fighting the last-owner
  // trigger to delete the personal household, which we deliberately
  // don't do (see comment above).
  if (!opts.households.some((h) => h.role === 'owner')) {
    throw new Error(
      'seedUserWithHouseholds: at least one household must have role "owner" ' +
        'so the auto-created personal household can be reused.',
    )
  }

  const primary = await createConfirmedUser(displayName)
  const autoCreated = await findAutoCreatedHousehold(primary.userId)

  const households: SeededUser['households'] = []
  const auxUserIds: string[] = []
  let reusedAutoHousehold = false

  for (const spec of opts.households) {
    if (spec.role === 'owner') {
      // Reuse the auto-created household for the first owner spec —
      // the only way to avoid leaving it as a stray membership without
      // wrestling the last-owner trigger.
      if (autoCreated && !reusedAutoHousehold) {
        const { data: renamed, error: renameErr } = await admin
          .from('households')
          .update({ name: spec.name })
          .eq('id', autoCreated.id)
          .select('id, name')
          .single()
        if (renameErr || !renamed) {
          throw new Error(
            `Failed to rename auto-created household to "${spec.name}": ${renameErr?.message ?? 'unknown'}`,
          )
        }
        households.push({ id: renamed.id, name: renamed.name, role: 'owner' })
        reusedAutoHousehold = true
        continue
      }

      // Subsequent owner-role specs get a fresh household.
      const { data: householdRow, error: hErr } = await admin
        .from('households')
        .insert({ name: spec.name, created_by: primary.userId })
        .select('id, name')
        .single()
      if (hErr || !householdRow) {
        throw new Error(
          `Failed to create owner household "${spec.name}": ${hErr?.message ?? 'unknown'}`,
        )
      }
      const { error: mErr } = await admin
        .from('household_members')
        .insert({
          household_id: householdRow.id,
          user_id: primary.userId,
          role: 'owner',
        })
      if (mErr) {
        throw new Error(
          `Failed to add primary as owner of "${spec.name}": ${mErr.message}`,
        )
      }
      households.push({ id: householdRow.id, name: householdRow.name, role: 'owner' })
      continue
    }

    // Non-owner role: the household needs an aux owner.
    const aux = await createConfirmedUser(
      `${spec.name} Owner ${uniqueSuffix()}`,
    )
    auxUserIds.push(aux.userId)

    // Aux's auto-created household is fine to leave alone — the
    // primary user never sees it because they're not a member.
    const { data: householdRow, error: hErr } = await admin
      .from('households')
      .insert({ name: spec.name, created_by: aux.userId })
      .select('id, name')
      .single()
    if (hErr || !householdRow) {
      throw new Error(
        `Failed to create aux-owned household "${spec.name}": ${hErr?.message ?? 'unknown'}`,
      )
    }
    const { error: auxMemErr } = await admin
      .from('household_members')
      .insert({
        household_id: householdRow.id,
        user_id: aux.userId,
        role: 'owner',
      })
    if (auxMemErr) {
      throw new Error(
        `Failed to add aux as owner of "${spec.name}": ${auxMemErr.message}`,
      )
    }
    const { error: primaryMemErr } = await admin
      .from('household_members')
      .insert({
        household_id: householdRow.id,
        user_id: primary.userId,
        role: spec.role,
      })
    if (primaryMemErr) {
      throw new Error(
        `Failed to add primary as ${spec.role} of "${spec.name}": ${primaryMemErr.message}`,
      )
    }
    households.push({
      id: householdRow.id,
      name: householdRow.name,
      role: spec.role,
    })
  }

  return {
    userId: primary.userId,
    email: primary.email,
    password: primary.password,
    displayName: primary.displayName,
    households,
    auxUserIds,
  }
}

/**
 * Tear down a seeded user (and any aux owners we spun up alongside).
 * Auth user deletion cascades through profiles → household_members,
 * and household ON DELETE CASCADE handles the rest.
 *
 * Safe to call multiple times — errors are swallowed so a flaky
 * teardown doesn't mask the real test failure.
 */
export async function cleanupSeededUser(seeded: SeededUser): Promise<void> {
  const admin = getAdminClient()
  const ids = [seeded.userId, ...seeded.auxUserIds]
  for (const id of ids) {
    try {
      await admin.auth.admin.deleteUser(id)
    } catch {
      // Best-effort cleanup; don't fail the test on teardown.
    }
  }
}
