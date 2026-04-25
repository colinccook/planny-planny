Feature: Store Cupboard Navigation

  Scenario: Store cupboard route is protected
    Given I am not authenticated
    When I navigate to the store cupboard page
    Then I should be redirected to the login page

  Scenario: Store cupboard tab appears in the tab bar
    Given I am on the login page
    Then I should see the login form
