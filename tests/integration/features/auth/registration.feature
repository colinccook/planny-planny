Feature: User Registration

  Scenario: New user can see the registration page
    Given I am on the registration page
    Then I should see the registration form

  Scenario: Registration form has all required fields
    Given I am on the registration page
    Then I should see a display name input
    And I should see an email input
    And I should see a password input
    And I should see a confirm password input
    And I should see a create account button

  Scenario: Registration page links to login
    Given I am on the registration page
    Then I should see a link to the login page
