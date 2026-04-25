import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { test } from '../../support/fixtures'
import {
  canEditMeals,
  canManageEvents,
  canManageMembers,
  canInviteMembers,
  canProposeIdeas,
  canSeeEvents,
  canSeeIdeas,
  canSeeMeals,
  canSeeVoteCounts,
  canSeeVoters,
  canVote,
  type Audience,
} from '../../../src/lib/permissions'

const { Given, Then } = createBdd(test)

const ROLES: Record<string, Audience> = {
  owner: 'owner',
  member: 'member',
  honoured_guest: 'honoured_guest',
  voting_guest: 'voting_guest',
  public: 'public',
  none: null,
}

// Maps the human-readable capability name used in Gherkin to the
// predicate function that owns it. If you add a new capability,
// register it here and add a row to the role-capability matrix
// feature for every role.
const CAPABILITIES: Record<string, (a: Audience) => boolean> = {
  'edit meals': canEditMeals,
  'manage events': canManageEvents,
  'propose ideas': canProposeIdeas,
  vote: canVote,
  'invite members': canInviteMembers,
  'manage members': canManageMembers,
  'see voter names': canSeeVoters,
  'see events': canSeeEvents,
  'see meals': canSeeMeals,
  'see ideas': canSeeIdeas,
  'see vote counts': canSeeVoteCounts,
}

interface MatrixWorld {
  audience: Audience | undefined
}

const world: MatrixWorld = { audience: undefined }

Given('a user with role {string}', async ({ page }, roleName: string) => {
  // The page fixture is required by playwright-bdd's parameter
  // signature, even though this scenario is pure-logic. Touch it
  // so the linter doesn't flag it as unused.
  void page
  if (!(roleName in ROLES)) {
    throw new Error(`Unknown role "${roleName}" in role-capability matrix`)
  }
  world.audience = ROLES[roleName]
})

Then(
  'their permission to {string} should be {word}',
  async ({ page }, capability: string, allowed: string) => {
    void page
    if (world.audience === undefined) {
      throw new Error('No role set — did the Given step run?')
    }
    const predicate = CAPABILITIES[capability]
    if (!predicate) {
      throw new Error(
        `Unknown capability "${capability}". Register it in tests/component/steps/role-capability.steps.ts`,
      )
    }
    let expected: boolean
    if (allowed === 'true') {
      expected = true
    } else if (allowed === 'false') {
      expected = false
    } else {
      throw new Error(
        `Invalid value for "allowed" in matrix: "${allowed}". Use "true" or "false".`,
      )
    }
    expect(predicate(world.audience)).toBe(expected)
  },
)
