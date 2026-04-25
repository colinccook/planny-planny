Feature: Day View Swipe Navigation
  As a user viewing a single day
  I want to swipe left or right to move between days
  so I can quickly browse my plan without using the back button

  Scenario: Swiping left advances to the next day
    Given I open a page with a swipeable day pager on "2026-04-20"
    When I swipe left across the day content
    Then the pager should show "2026-04-21"

  Scenario: Swiping right goes to the previous day
    Given I open a page with a swipeable day pager on "2026-04-20"
    When I swipe right across the day content
    Then the pager should show "2026-04-19"

  Scenario: A short swipe is ignored
    Given I open a page with a swipeable day pager on "2026-04-20"
    When I do a tiny horizontal nudge across the day content
    Then the pager should show "2026-04-20"

  Scenario: A vertical drag does not change the day
    Given I open a page with a swipeable day pager on "2026-04-20"
    When I drag vertically across the day content
    Then the pager should show "2026-04-20"

  Scenario: Swiping a meal scrolls between meals instead of changing the day
    Given I open a page with a swipeable day pager on "2026-04-20" with 3 meals
    When I swipe left on the first meal card
    Then the pager should show "2026-04-20"
    And the second meal card should be the active meal

  Scenario: Swiping right on the last meal stays on the day
    Given I open a page with a swipeable day pager on "2026-04-20" with 3 meals
    When I swipe right on the first meal card
    Then the pager should show "2026-04-20"
    And the first meal card should be the active meal
