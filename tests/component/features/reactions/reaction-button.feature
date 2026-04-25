Feature: Reusable reaction button
  As a household member
  I want a single reusable reaction control
  so reacting to ideas and meals feels consistent

  Scenario: Unreacted single-option button shows grayscale / dashed look
    Given I open the reaction button demo
    Then the reaction button "rx-single" should be in the unreacted state

  Scenario: Tapping a single-option button likes immediately
    Given I open the reaction button demo
    When I tap the reaction button "rx-single"
    Then the reaction button "rx-single" should be in the reacted state

  Scenario: Tapping a reacted button removes the reaction
    Given I open the reaction button demo
    When I tap the reaction button "rx-single"
    And I tap the reaction button "rx-single"
    Then the reaction button "rx-single" should be in the unreacted state

  Scenario: Tapping a multi-option button opens the emoji picker
    Given I open the reaction button demo
    When I tap the reaction button "rx-multi"
    Then the reaction picker for "rx-multi" should be visible

  Scenario: Picking a reaction from the multi-option picker sets the button reacted
    Given I open the reaction button demo
    When I tap the reaction button "rx-multi"
    And I pick the reaction "Love"
    Then the reaction button "rx-multi" should be in the reacted state

  Scenario: Long pressing the button opens a tray of reactors
    Given I open the reaction button demo
    When I long press the reaction button "rx-single"
    Then the reactors tray should show "Alex"
