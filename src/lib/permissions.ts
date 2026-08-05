// ============================================================
// Permissions — single source of truth for access levels.
//
// There are five audiences (in order from most to least
// privileged):
//
//   • owner          — full control, can manage members.
//   • member         — full edit rights on the meal plan.
//   • honoured_guest — can see everything, propose ideas, vote.
//   • voting_guest   — can see everything, vote only.
//   • public         — anonymous viewer of a public share link;
//                      sees meals & ideas with vote counts only.
//
// When adding a new feature, decide for each audience whether
// it is allowed — and add a Vitest matrix case + a BDD scenario
// covering the new capability.
// ============================================================

/** A signed-in member's role within a household. */
export type Role = 'owner' | 'member' | 'honoured_guest' | 'voting_guest'

/** Any viewer — a signed-in role, the anonymous public, or
 * `null` for a user who has not joined this household. */
export type Audience = Role | 'public' | null

/** Roles that can be issued via an invite link. */
export const INVITABLE_ROLES = ['member', 'honoured_guest', 'voting_guest'] as const
export type InvitableRole = (typeof INVITABLE_ROLES)[number]

export interface AccessLevelInfo {
  /** Stable key — also the value stored in the DB for signed-in
   * roles, or the literal string `"public"`. */
  key: Audience & string
  /** Friendly label for the UI. */
  label: string
  /** One-line description of the audience. */
  summary: string
  /** Bullet list of capabilities (positive phrasing). */
  can: string[]
  /** Bullet list of restrictions (what they can't do). */
  cannot: string[]
}

/**
 * Human-readable description of every access level. Used by the
 * "What do these levels mean?" tray and the role badge tooltip.
 */
export const ACCESS_LEVELS: AccessLevelInfo[] = [
  {
    key: 'owner',
    label: 'Owner',
    summary: 'Full control of the household.',
    can: [
      'Everything a member can do',
      'Remove other members',
      'Change anyone\u2019s access level',
      'Toggle the public share link',
      'Delete the household permanently',
      'Use the ChatGPT plugin to manage the household',
    ],
    cannot: [],
  },
  {
    key: 'member',
    label: 'Member',
    summary: 'Trusted family member with full edit rights.',
    can: [
      'See everything',
      'Add, move and delete meals',
      'Add and edit events (visitors etc.)',
      'Propose ideas and vote',
      'Add, edit and tick off todo items (with notes & due dates)',
      'Record meal outcomes (did it actually happen?)',
      'See who voted',
      'Invite new members',
      'Use the ChatGPT plugin to manage the household',
    ],
    cannot: ['Remove other members', 'Change other people\u2019s access levels'],
  },
  {
    key: 'honoured_guest',
    label: 'Honoured Guest',
    summary: 'Like a member, but can\u2019t invite new people.',
    can: [
      'See everything',
      'Add, move and delete meals',
      'Add and edit events (visitors etc.)',
      'Propose ideas and vote',
      'Add, edit and tick off todo items (with notes & due dates)',
      'Record meal outcomes (did it actually happen?)',
      'See who voted',
      'Use the ChatGPT plugin to manage the household',
    ],
    cannot: ['Invite new members'],
  },
  {
    key: 'voting_guest',
    label: 'Voting Guest',
    summary: 'Can chime in with a vote, nothing else.',
    can: [
      'See everything',
      'Vote on meals and ideas',
      'See who voted',
    ],
    cannot: [
      'Propose meal ideas',
      'Add, move or delete meals',
      'Add or edit events',
      'Add, edit or tick off todo items',
      'Record meal outcomes',
      'Invite new members',
      'Use the ChatGPT plugin',
    ],
  },
  {
    key: 'public',
    label: 'Public Link',
    summary: 'Anyone with the share link \u2014 no account needed.',
    can: [
      'See upcoming meals',
      'See meal ideas',
      'See vote counts',
      'See which meals actually happened',
    ],
    cannot: [
      'See events (visitors, schedule changes)',
      'See who voted',
      'Vote, propose, edit or record outcomes',
      'Use the ChatGPT plugin',
    ],
  },
]

const LABELS: Record<string, string> = Object.fromEntries(
  ACCESS_LEVELS.map((l) => [l.key, l.label]),
)

/** Friendly label for a role/audience key. Falls back to the
 *  raw key if it isn't recognised. */
export function roleLabel(role: Audience | string | undefined): string {
  if (!role) return 'No access'
  return LABELS[role] ?? role
}

// ── Capability predicates ─────────────────────────────────────
//
// These are the *only* place in the app that decides what each
// audience may do. Components and pages must call these helpers
// rather than comparing role strings inline. The matching RLS
// policies are defined in supabase/migrations.
// --------------------------------------------------------------

/** Owner / member / honoured guest — i.e. the people who can
 *  change the plan. Honoured guests are trusted family members
 *  too; they just can't invite new people in. */
export function canEditMeals(audience: Audience): boolean {
  return audience === 'owner' || audience === 'member' || audience === 'honoured_guest'
}

/** Same audience as meal editing today, kept distinct so that
 *  future tweaks only need to change one predicate. */
export function canManageEvents(audience: Audience): boolean {
  return canEditMeals(audience)
}

/** Owner / member / honoured guest. */
export function canProposeIdeas(audience: Audience): boolean {
  return canEditMeals(audience)
}

/** Owner / member / honoured guest — same audience as meal
 *  editing. Controls who can create, tick off and delete todo
 *  items (both household-level and private reminders). Voting
 *  guests and public viewers cannot manage todos. */
export function canManageTodos(audience: Audience): boolean {
  return canEditMeals(audience)
}

/** Owner / member / honoured guest / voting guest. */
export function canVote(audience: Audience): boolean {
  return canProposeIdeas(audience) || audience === 'voting_guest'
}

/** Any signed-in member of the household — public share viewers
 *  only see vote counts, not the names of voters. */
export function canSeeVoters(audience: Audience): boolean {
  return audience !== null && audience !== 'public'
}

/** Public viewers don't see events; everyone else does. */
export function canSeeEvents(audience: Audience): boolean {
  return canSeeVoters(audience)
}

/** Everyone (including public) can see meals. Returns false for
 *  `null` so we don't render anything for a logged-out user who
 *  hasn't joined the household via a share link. */
export function canSeeMeals(audience: Audience): boolean {
  return audience !== null
}

/** Everyone (including public) can see ideas — public viewers
 *  see only the title and the thumbs-up count. */
export function canSeeIdeas(audience: Audience): boolean {
  return audience !== null
}

/** Owner / member / honoured guest — same audience as meal
 *  editing today. Controls who can record whether a planned
 *  meal actually happened (the headline metric of the whole
 *  app). Voting guests and public viewers cannot record
 *  outcomes — recording one is a privileged act that affects
 *  the household's success rate.
 *
 *  Kept distinct from `canEditMeals` so future divergence
 *  (e.g. allowing voting guests to confirm "yes, that one
 *  happened") only requires a one-line change here and a
 *  matching one in supabase/migrations/…_meal_outcomes.sql. */
export function canRecordOutcomes(audience: Audience): boolean {
  return canEditMeals(audience)
}

/** Owners and members can issue invite links. Honoured guests
 *  cannot — bringing new people into the household is reserved
 *  for owners and full members. */
export function canInviteMembers(audience: Audience): boolean {
  return audience === 'owner' || audience === 'member'
}

/** Owner only — removing other members or changing access
 *  levels in the member list. */
export function canManageMembers(audience: Audience): boolean {
  return audience === 'owner'
}

/** Anyone who has any view of the household can see vote totals.
 *  Public share viewers see counts but not voter names — see
 *  `canSeeVoters`. */
export function canSeeVoteCounts(audience: Audience): boolean {
  return audience !== null
}

/** Owner only — only an owner may permanently delete the household
 *  and all its data (meals, members, invites). */
export function canDeleteHousehold(audience: Audience): boolean {
  return audience === 'owner'
}

/** Owner / member / honoured guest — the same audience that can edit
 *  meals. They may authenticate the ChatGPT plugin and interact with
 *  the household via the API. Voting guests and public viewers cannot
 *  use the plugin because it exposes write operations (create todo,
 *  add meal, propose idea). */
export function canUsePlugin(audience: Audience): boolean {
  return canEditMeals(audience)
}
