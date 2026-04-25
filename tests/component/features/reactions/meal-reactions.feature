Feature: Meal plan reactions
  As a household member
  I want to react with thumbs up to meals
  so the household can see which meals are loved

  Scenario: Tapping the meal reaction button likes the meal
    Given I open a day detail view with meal reactions support
    When I react to the meal "Roast chicken" with a thumbs up
    Then the meal "Roast chicken" reaction should be reacted

  Scenario: Tapping again unreacts the meal
    Given I open a day detail view with meal reactions support
    When I react to the meal "Roast chicken" with a thumbs up
    And I react to the meal "Roast chicken" with a thumbs up
    Then the meal "Roast chicken" reaction should be unreacted

  Scenario: Long pressing the meal button reveals reactors
    Given I open a day detail view with meal reactions support
    When I react to the meal "Roast chicken" with a thumbs up
    And I long press the meal reaction for "Roast chicken"
    Then the reactors tray should show "You"
