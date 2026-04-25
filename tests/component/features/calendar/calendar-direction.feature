Feature: Calendar Direction Toggle

  Scenario: Calendar tab shows forward indicator by default
    Given I open a page with the calendar direction component in forward mode
    Then I should see the forward direction indicator
    And I should see a "View past" button

  Scenario: Tapping "View past" switches to backward mode
    Given I open a page with the calendar direction component in forward mode
    When I click the "View past" button
    Then I should see the backward direction info card
    And the info card should say "Tap the Calendar tab again to switch back to upcoming days."

  Scenario: Dismissing the backward info card hides it
    Given I open a page with the calendar direction component in backward mode
    Then I should see the backward direction info card
    When I click the dismiss info button
    Then I should not see the backward direction info card

  Scenario: Backward mode shows "Viewing past days" heading
    Given I open a page with the calendar direction component in backward mode
    Then the info card should display "Viewing past days"

  Scenario: Yesterday label is shown for the previous day in backward mode
    Given I open a page with day labels in backward mode
    Then I should see "Yesterday" as a day label

  Scenario: Backward date range generates past dates
    Given a backward date range starting from today with 3 days
    Then the first date should be today
    And the last date should be 2 days ago
