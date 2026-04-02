Feature: User Login

  Scenario: User can see the login page
    Given I am on the login page
    Then I should see the login form

  Scenario: Login form has email and password fields
    Given I am on the login page
    Then I should see an email input on the login page
    And I should see a password input on the login page
    And I should see a sign in button

  Scenario: Login page links to registration
    Given I am on the login page
    Then I should see a link to the registration page
