Feature: Meal ideas and reactions
  As a household member
  I want to add ideas and react with thumbs up
  so the household can align on meal ideas

  Scenario: Add an idea from a tray
    Given I open a day detail view with ideas support
    When I add the idea "Burgers"
    Then I should see the idea "Burgers" with a faded thumbs-up pill

  Scenario: React to an idea with thumbs up
    Given I open a day detail view with ideas support
    And I add the idea "Fajitas"
    When I react to the idea "Fajitas" with a thumbs up
    Then I should see the idea "Fajitas" with "1" thumbs up
    And the thumbs-up count should be bold for "Fajitas"
    And I should see "You" in the idea reactors list

  Scenario: Toggle thumbs up off
    Given I open a day detail view with ideas support
    And I add the idea "Nachos"
    And I react to the idea "Nachos" with a thumbs up
    When I react to the idea "Nachos" with a thumbs up
    Then I should see the idea "Nachos" with a faded thumbs-up pill

  Scenario: Open reaction picker from the idea pill
    Given I open a day detail view with ideas support
    And I add the idea "Tacos"
    When I open reactions from the pill for "Tacos"
    Then I should see the reaction picker
