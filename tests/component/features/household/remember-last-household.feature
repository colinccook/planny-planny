Feature: Remember last household across sessions
  When a user belongs to multiple households, the app should pick up
  where they left off — log them back into the household they were last
  using. If that household is no longer one of their memberships (they
  were removed, the household was deleted, etc.) the app falls back to
  another household they are still a member of.

  These scenarios pin down the pure selection rule implemented by
  `pickInitialHousehold` in `src/lib/householdSelection.ts`. The hook
  `useHousehold` reads/writes the user's last household id to
  `localStorage` (scoped per user) and delegates the choice to this
  function on every render — so getting this matrix right is enough to
  guarantee the user-facing behaviour.

  Scenario Outline: Pick the right household to land in after login
    Given the user is a member of households "<memberships>"
    And the last household they used was "<stored>"
    Then the household they should land in is "<expected>"

    Examples: Stored household is still a current membership
      | memberships | stored | expected |
      | h1,h2,h3    | h2     | h2       |
      | h1,h2       | h1     | h1       |
      | h1,h2,h3    | h3     | h3       |

    Examples: Stored household is no longer a membership — fall back
      | memberships | stored | expected |
      | h1,h2       | h3     | h1       |
      | h2,h3       | h1     | h2       |

    Examples: Nothing remembered yet — pick the first available household
      | memberships | stored | expected |
      | h1,h2       |        | h1       |
      | h7          |        | h7       |

    Examples: User has no memberships — nothing to land in
      | memberships | stored | expected |
      |             | h1     | none     |
      |             |        | none     |

  Scenario: Stored household ids are scoped per user
    # Two people sharing a device must not see each other's last
    # household id surface in their own session.
    Given the storage key for user "alice"
    And the storage key for user "bob"
    Then the two storage keys should differ
    And the storage key for user "alice" should mention "alice"
