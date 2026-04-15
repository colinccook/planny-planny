Feature: Meal ideas and reactions
  As a household member
  I want to add ideas and react with thumbs up
  so the household can align on meal ideas

  Scenario: Add an idea from a tray
    Given I open a day detail view with ideas support
    When I add the idea "Burgers"
    Then I should see the idea "Burgers" with "0" thumbs up

  Scenario: React to an idea with thumbs up
    Given I open a day detail view with ideas support
    And I add the idea "Fajitas"
    When I react to the idea "Fajitas" with a thumbs up
    Then I should see the idea "Fajitas" with "1" thumbs up
    And I should see "You" in the idea reactors list
