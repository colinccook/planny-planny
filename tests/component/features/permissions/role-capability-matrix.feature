Feature: Permission rules — role × capability matrix
  These scenarios are the canonical BDD specification of who can
  do what. Each capability used by the app is a function in
  `src/lib/permissions.ts`. The unit-test matrix in
  `src/lib/permissions.test.ts` covers every (role, capability)
  pair exhaustively; this feature pins down the user-facing
  decisions for each role so that a deliberate, human-readable
  record exists for any future change to the predicates.

  When adding a new capability:
    1. Add a predicate in `src/lib/permissions.ts`.
    2. Add a row here for every role.
    3. Update the "What do these levels mean?" tray content in
       `ACCESS_LEVELS` so users see the new rule.

  Scenario Outline: A role can or cannot perform a capability
    Given a user with role "<role>"
    Then their permission to "<capability>" should be <allowed>

    Examples: Owners — full control
      | role  | capability                   | allowed |
      | owner | edit meals                   | true    |
      | owner | manage events                | true    |
      | owner | propose ideas                | true    |
      | owner | vote                         | true    |
      | owner | invite members               | true    |
      | owner | manage members               | true    |
      | owner | see voter names              | true    |
      | owner | see events                   | true    |

    Examples: Members — full edit, no member management
      | role   | capability                  | allowed |
      | member | edit meals                  | true    |
      | member | manage events               | true    |
      | member | propose ideas               | true    |
      | member | vote                        | true    |
      | member | invite members              | true    |
      | member | manage members              | false   |
      | member | see voter names             | true    |
      | member | see events                  | true    |

    Examples: Honoured guests — full edit except invites
      | role           | capability      | allowed |
      | honoured_guest | edit meals      | true    |
      | honoured_guest | manage events   | true    |
      | honoured_guest | propose ideas   | true    |
      | honoured_guest | vote            | true    |
      | honoured_guest | invite members  | false   |
      | honoured_guest | manage members  | false   |
      | honoured_guest | see voter names | true    |
      | honoured_guest | see events      | true    |

    Examples: Voting guests — vote only
      | role         | capability      | allowed |
      | voting_guest | edit meals      | false   |
      | voting_guest | manage events   | false   |
      | voting_guest | propose ideas   | false   |
      | voting_guest | vote            | true    |
      | voting_guest | invite members  | false   |
      | voting_guest | manage members  | false   |
      | voting_guest | see voter names | true    |
      | voting_guest | see events      | true    |

    Examples: Public — counts only
      | role   | capability      | allowed |
      | public | edit meals      | false   |
      | public | manage events   | false   |
      | public | propose ideas   | false   |
      | public | vote            | false   |
      | public | invite members  | false   |
      | public | manage members  | false   |
      | public | see voter names | false   |
      | public | see events      | false   |
      | public | see meals       | true    |
      | public | see ideas       | true    |
      | public | see vote counts | true    |
