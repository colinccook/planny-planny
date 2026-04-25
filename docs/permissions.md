# Permissions / Access Levels

Planny Planny has five **access levels**. Every UI element and every database
policy decides what to show or allow based on which level the current viewer
holds. This document is the reference for how the system is wired and the rules
you must follow when adding a new feature.

If you only read one section, read [Adding a new capability](#adding-a-new-capability).

---

## The five levels

| Key              | Label            | Audience                                                         |
| ---------------- | ---------------- | ---------------------------------------------------------------- |
| `owner`          | Owner            | The user who created the household, or anyone they promote.      |
| `member`         | Member           | A trusted family member with full edit rights.                   |
| `honoured_guest` | Honoured Guest   | Like a member, but **cannot invite** new people.                 |
| `voting_guest`   | Voting Guest     | Sees everything, can **vote only**.                              |
| `public`         | Public Link      | Anonymous viewer of a public share link — meals + ideas + votes. |

The capability matrix:

| Capability              | Owner | Member | Honoured Guest | Voting Guest | Public |
| ----------------------- | :---: | :----: | :------------: | :----------: | :----: |
| See meals               |  ✅   |   ✅   |       ✅       |      ✅      |   ✅   |
| See ideas               |  ✅   |   ✅   |       ✅       |      ✅      |   ✅   |
| See vote counts         |  ✅   |   ✅   |       ✅       |      ✅      |   ✅   |
| See events              |  ✅   |   ✅   |       ✅       |      ✅      |   ❌   |
| See **who** voted       |  ✅   |   ✅   |       ✅       |      ✅      |   ❌   |
| Vote                    |  ✅   |   ✅   |       ✅       |      ✅      |   ❌   |
| Propose ideas           |  ✅   |   ✅   |       ✅       |      ❌      |   ❌   |
| Add / move meals        |  ✅   |   ✅   |       ✅       |      ❌      |   ❌   |
| Add / edit events       |  ✅   |   ✅   |       ✅       |      ❌      |   ❌   |
| Invite people           |  ✅   |   ✅   |       ❌       |      ❌      |   ❌   |
| Remove members / change roles | ✅ | ❌  |       ❌       |      ❌      |   ❌   |

The same data lives, in machine form, in `ACCESS_LEVELS` inside
[`src/lib/permissions.ts`](../src/lib/permissions.ts). The "What do these
levels mean?" tray renders straight from that constant, so the table above and
the in-app explainer are always in sync.

---

## TypeScript layer (`src/lib/permissions.ts`)

The module is the **single source of truth**. It exports:

- `type Role` — `'owner' | 'member' | 'honoured_guest' | 'voting_guest'`. The
  string stored in `household_members.role`.
- `type Audience` — `Role | 'public' | null`. Anything that might be looking at
  data: a signed-in role, the anonymous public, or a logged-out user with no
  access. Predicates accept `Audience` so that callers can pass the result of
  `useHousehold().currentRole` directly.
- `INVITABLE_ROLES` — the roles you can hand out via an invite. Owners can be
  promoted later from the change-role tray, but you can't issue an "owner"
  invite link.
- `ACCESS_LEVELS` — the array of `AccessLevelInfo` cards rendered by
  `AccessLevelsList`. Add a `can:` / `cannot:` bullet here whenever you add a
  capability, otherwise users won't know about it.
- `roleLabel(role)` — friendly label for a role badge / heading.

### Capability predicates

| Predicate           | True for                                              |
| ------------------- | ----------------------------------------------------- |
| `canEditMeals`      | owner / member / honoured_guest                       |
| `canManageEvents`   | same as `canEditMeals`                                |
| `canProposeIdeas`   | same as `canEditMeals`                                |
| `canVote`           | every signed-in role                                  |
| `canInviteMembers`  | owner / member only                                   |
| `canManageMembers`  | owner only                                            |
| `canSeeVoters`      | every signed-in role (i.e. not `public`, not `null`)  |
| `canSeeEvents`      | same as `canSeeVoters`                                |
| `canSeeMeals`       | every audience except `null`                          |
| `canSeeIdeas`       | every audience except `null`                          |
| `canSeeVoteCounts`  | every audience except `null`                          |

### Rules of the road

- **Never** compare role strings inline (`role === 'owner' || role === 'member'`).
  Always go through a predicate. If you find yourself wanting a comparison
  that doesn't exist, add a new predicate.
- Components that need to gate a piece of UI take `currentRole` from
  `useHousehold()` and pass it straight to the predicate.
- Public share viewers don't go through `useHousehold()`. The
  `PublicHouseholdPage` builds its own audience as the literal string
  `'public'`.

---

## React layer

### Hook: `useHousehold`

Lives at `src/hooks/useHousehold.tsx`. The signed-in surface area is:

- `memberships: { household, role }[]` — every household the user belongs to,
  with a typed `Role`. Drives the **My Memberships** panel.
- `currentHousehold` — the one currently being viewed.
- `currentRole: Role | null` — the user's role in `currentHousehold`.
- `switchHousehold(id)` — change which household the rest of the app is
  scoped to.

When `memberships` is empty, the tab bar hides every tab except Settings, and
`AppShell` redirects every other route to `/settings`. This keeps the user on
a single screen until they create or accept an invite into a household.

### Components

- `RoleBadge` — friendly chip for a role; uses `roleLabel`.
- `AccessLevelsList` — the stack of cards used both as the explainer and as
  the role picker. Pass `onSelect` to make the cards clickable, `currentKey`
  to highlight the current selection, and `filter` to omit a level (e.g.
  hide `public` when picking a member's role).
- `AccessLevelsLink` — the "What do these levels mean?" link + tray. Mounted
  on the Settings page, the Member List, the Invite Manager, the My
  Memberships card, and the public share page.
- `MemberList` — owners can tap a member to open the role-picker tray.
- `MyMemberships` — lists every household with a confirm-then-Leave action.
  Surfaces the last-owner safeguard error from the database inline.
- `InviteManager` — uses `canInviteMembers`, so the section is hidden for
  honoured guests. Requires an email; that email becomes the only address
  that can accept the invite.

---

## Database / RLS layer

The TypeScript predicates and the Postgres RLS policies are intentionally
mirrored — every change must be made in both places.

Migrations to know about:

- `20260424000001_access_levels.sql` — extends the role check constraints to
  include `honoured_guest` and `voting_guest`, migrates any existing
  `'guest'` rows to `'honoured_guest'`, and rewrites the RLS policies for
  meal_plans, meal_ideas, reactions, household_members, household_invites,
  and households.
- `20260424000002_invites_and_leaving.sql` — adds the `email` column to
  `household_invites`, a trigger that consumes an invite when the matching
  user joins, and the **last-owner safeguard** trigger that prevents the
  final owner of a household from being removed.

### Per-email invites

`household_invites.email` is `not null`. Every invite is addressed to a
specific email — the migration drops any pre-existing "anyone with link"
rows during deployment so the contract holds for both new and old
installations. The `JoinInvitePage` checks that the signed-in user's email
matches the invite before letting them join (and treats a missing user
email or invite email as a mismatch). A trigger on `household_members`
deletes the invite as soon as the join happens. The end result: invite
links are single-use and personal — sharing the URL with a different
person doesn't grant them access.

### Public share

A household with a non-null `public_share_token` exposes its meals, ideas
and reactions to anonymous reads via dedicated RLS policies. The page never
selects the `user_id` column on reactions, so voter identity stays private —
the predicate `canSeeVoters` returns `false` for `'public'` to enforce this
in the UI as well.

---

## Adding a new capability

When you build a new feature:

1. **Decide the audience.** For each of the five levels, write down whether
   the feature is allowed. Put this matrix in your PR description.
2. **Add (or reuse) a predicate** in `src/lib/permissions.ts`. Keep the
   function tiny — composition over conditionals.
3. **Update `ACCESS_LEVELS`** so the explainer tray shows the new rule under
   the right `can:` / `cannot:` list.
4. **Add a row per role** to
   `tests/features/permissions/role-capability-matrix.feature`. The
   matrix is the canonical BDD spec — every predicate is tested for every
   role.
5. **Mirror the rule in RLS** with a new migration in
   `supabase/migrations/`. The TypeScript matrix and the RLS policies must
   agree; if they drift, the UI will offer actions the database refuses.
6. **Add BDD scenarios** for the user-facing flow — the right role can use
   it, the wrong role cannot.
7. **Update this document** if the new capability changes any of the tables
   above.

Doing all seven steps in one PR is what keeps the system honest.
