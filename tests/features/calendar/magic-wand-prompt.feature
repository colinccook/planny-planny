Feature: Magic Wand AI Prompt Generator
  As a user I want to generate an AI prompt for meal suggestions
  so I can paste it into ChatGPT and get ideas tailored to my household

  Background:
    Given a household with 2 adults, 1 child, and 1 baby
    And the date is "Monday, 14 April"

  Scenario: Magic wand button appears on empty day
    Given the day has no meals planned
    When I view the day detail
    Then I should see the magic wand button

  Scenario: Magic wand opens the prompt tray
    Given the day has no meals planned
    When I view the day detail
    And I tap the magic wand button
    Then I should see the AI prompt tray

  Scenario: Prompt includes household headcount
    Given the day has no meals planned
    When I view the day detail
    And I tap the magic wand button
    Then the prompt should mention "2 adults"
    And the prompt should mention "1 child"
    And the prompt should mention "1 weaning baby"

  Scenario: Easy complexity is selected by default
    Given the day has no meals planned
    When I view the day detail
    And I tap the magic wand button
    Then the easy option should be selected
    And the prompt should mention "under 30 minutes"

  Scenario: Switching to complicated changes the prompt
    Given the day has no meals planned
    When I view the day detail
    And I tap the magic wand button
    And I select the complicated option
    Then the complicated option should be selected
    And the prompt should mention "more involved"

  Scenario: Day theme is included by default
    Given the day has a theme "Oily fish night"
    And the day has no meals planned
    When I view the day detail
    And I tap the magic wand button
    Then the prompt should mention "Oily fish night"
    And the theme checkbox should be checked

  Scenario: Unchecking the theme removes it from prompt
    Given the day has a theme "Oily fish night"
    And the day has no meals planned
    When I view the day detail
    And I tap the magic wand button
    And I uncheck the theme checkbox
    Then the prompt should not mention "Oily fish night"

  Scenario: Events are included in the prompt
    Given the day has an event "Birthday party" with 3 extra adults
    And the day has no meals planned
    When I view the day detail
    And I tap the magic wand button
    Then the prompt should mention "Birthday party"
    And the prompt should mention "5 adults"

  Scenario: Suggested ingredients are included in prompt
    Given the day has no meals planned
    And there are suggested ingredients "Lentils, Sweet potato, Chickpeas"
    When I view the day detail
    And I tap the magic wand button
    Then the prompt should mention "Lentils"
    And the prompt should mention "any other whole ingredients can be used"

  Scenario: Prompt is editable
    Given the day has no meals planned
    When I view the day detail
    And I tap the magic wand button
    And I edit the prompt to say "Just make me a pizza"
    Then the prompt textarea should contain "Just make me a pizza"

  Scenario: Copy button copies prompt to clipboard
    Given the day has no meals planned
    When I view the day detail
    And I tap the magic wand button
    And I tap the copy button
    Then the copy button should show "Copied to clipboard"

  Scenario: Prompt includes healthy eating guidance
    Given the day has no meals planned
    When I view the day detail
    And I tap the magic wand button
    Then the prompt should mention "healthy and whole-ingredient based"
    And the prompt should mention "appropriate for children"

  Scenario: Weaning baby guidance included when baby present
    Given the day has no meals planned
    When I view the day detail
    And I tap the magic wand button
    Then the prompt should mention "weaning baby"

  Scenario: Guest users do not see the magic wand button
    Given the day has no meals planned
    And the user is a guest
    When I view the day detail
    Then I should not see the magic wand button
