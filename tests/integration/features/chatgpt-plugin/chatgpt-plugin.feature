Feature: ChatGPT Plugin API
  The ChatGPT plugin Edge Function exposes a small REST API that lets
  ChatGPT interact with a user's household. All endpoints require a
  valid Supabase JWT and enforce RLS — users can only see / mutate
  data in households they belong to.

  Background:
    Given I am signed in as an owner of a household

  # ── Todos ──────────────────────────────────────────────────────────

  Scenario: List todos returns an empty array when none exist
    When I call GET /chatgpt-plugin/todos
    Then the response status is 200
    And the response body contains a "todos" array

  Scenario: Create a todo then list it back
    When I create a todo with title "Buy oat milk" for today
    Then the response status is 201
    And the response body contains a todo with title "Buy oat milk"
    When I call GET /chatgpt-plugin/todos
    Then the "todos" array includes an item with title "Buy oat milk"

  Scenario: Creating a todo without a title returns 400
    When I create a todo with no title
    Then the response status is 400
    And the response body contains an error message

  # ── Meals ──────────────────────────────────────────────────────────

  Scenario: List meals returns an array
    When I call GET /chatgpt-plugin/meals
    Then the response status is 200
    And the response body contains a "meals" array

  Scenario: Add a meal then list it back
    When I add a meal with title "Spaghetti Bolognese" for tomorrow
    Then the response status is 201
    And the response body contains a meal with title "Spaghetti Bolognese"
    When I call GET /chatgpt-plugin/meals with tomorrow's date range
    Then the "meals" array includes an item with title "Spaghetti Bolognese"

  # ── Ideas ──────────────────────────────────────────────────────────

  Scenario: List ideas returns an array
    When I call GET /chatgpt-plugin/ideas
    Then the response status is 200
    And the response body contains an "ideas" array

  Scenario: Propose an idea then list it back
    When I propose an idea with title "Homemade pizza"
    Then the response status is 201
    And the response body contains an idea with title "Homemade pizza"
    When I call GET /chatgpt-plugin/ideas
    Then the "ideas" array includes an item with title "Homemade pizza"

  # ── Events ─────────────────────────────────────────────────────────

  Scenario: List events returns an array
    When I call GET /chatgpt-plugin/events
    Then the response status is 200
    And the response body contains an "events" array

  # ── Auth ───────────────────────────────────────────────────────────

  Scenario: Calling the API without a JWT returns 401
    When I call GET /chatgpt-plugin/todos without authentication
    Then the response status is 401
    And the response body contains an error message
