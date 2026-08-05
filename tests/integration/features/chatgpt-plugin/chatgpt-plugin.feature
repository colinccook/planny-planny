Feature: ChatGPT Plugin API
  The ChatGPT plugin Edge Function exposes a full-parity REST API so
  ChatGPT can interact with a user's household conversationally.
  All endpoints require a valid Supabase JWT and enforce RLS — users
  can only see / mutate data in households they belong to.

  Background:
    Given I am signed in as an owner of a household for the plugin

  # ── Auth guard ──────────────────────────────────────────────────────

  Scenario: Calling the API without a JWT returns 401
    When I call the plugin endpoint GET /todos without authentication
    Then the plugin response status is 401
    And the plugin response contains an error

  # ── Todos — full lifecycle ──────────────────────────────────────────

  Scenario: List todos returns an empty array when none exist
    When I call the plugin endpoint GET /todos
    Then the plugin response status is 200
    And the plugin response contains a "todos" array

  Scenario: Create a todo and list it back
    When I call the plugin endpoint POST /todos with body:
      """
      { "title": "Buy oat milk", "date": "2099-01-01" }
      """
    Then the plugin response status is 201
    And the plugin response contains a todo with title "Buy oat milk"
    When I call the plugin endpoint GET /todos
    Then the "todos" array includes an item titled "Buy oat milk"

  Scenario: Update a todo's title
    Given I have created a plugin todo titled "Old title" for date "2099-01-01"
    When I call the plugin endpoint PATCH /todos/:id with body:
      """
      { "title": "New title" }
      """
    Then the plugin response status is 200
    And the plugin response contains a todo with title "New title"

  Scenario: Complete then reopen a todo
    Given I have created a plugin todo titled "Water plants" for date "2099-01-01"
    When I complete the plugin todo
    Then the plugin response status is 200
    And the todo has a completed_on date
    When I reopen the plugin todo
    Then the plugin response status is 200
    And the todo has no completed_on date

  Scenario: Delete a todo permanently
    Given I have created a plugin todo titled "Throw away" for date "2099-01-01"
    When I delete the plugin todo
    Then the plugin response status is 200
    And the plugin response contains deleted true

  Scenario: Creating a todo without a title returns 400
    When I call the plugin endpoint POST /todos with body:
      """
      { "note": "No title here" }
      """
    Then the plugin response status is 400
    And the plugin response contains an error

  # ── Meals — full lifecycle ──────────────────────────────────────────

  Scenario: List meals returns an array
    When I call the plugin endpoint GET /meals
    Then the plugin response status is 200
    And the plugin response contains a "meals" array

  Scenario: Add a meal and list it back
    When I call the plugin endpoint POST /meals with body:
      """
      { "title": "Spaghetti Bolognese", "date": "2099-01-02" }
      """
    Then the plugin response status is 201
    And the plugin response contains a meal with title "Spaghetti Bolognese"
    When I call the plugin endpoint GET /meals with params from=2099-01-01&to=2099-01-07
    Then the "meals" array includes an item titled "Spaghetti Bolognese"

  Scenario: Update a meal's title
    Given I have created a plugin meal titled "Pasta" for date "2099-01-02"
    When I call the plugin endpoint PATCH /meals/:id with body:
      """
      { "title": "Pasta Primavera" }
      """
    Then the plugin response status is 200
    And the plugin response contains a meal with title "Pasta Primavera"

  Scenario: Copy a meal to another date
    Given I have created a plugin meal titled "Fish and chips" for date "2099-01-03"
    When I call the plugin endpoint POST /meals/:id/copy with body:
      """
      { "target_date": "2099-01-10" }
      """
    Then the plugin response status is 201
    And the plugin response contains moved false

  Scenario: Move a meal to another date
    Given I have created a plugin meal titled "Sunday roast" for date "2099-01-04"
    When I call the plugin endpoint POST /meals/:id/copy with body:
      """
      { "target_date": "2099-01-11", "move": true }
      """
    Then the plugin response status is 201
    And the plugin response contains moved true

  Scenario: Delete a meal
    Given I have created a plugin meal titled "Leftovers" for date "2099-01-05"
    When I delete the plugin meal
    Then the plugin response status is 200
    And the plugin response contains deleted true

  # ── Meal outcomes ───────────────────────────────────────────────────

  Scenario: List outcomes returns an array
    When I call the plugin endpoint GET /outcomes
    Then the plugin response status is 200
    And the plugin response contains an "outcomes" array

  Scenario: Record and then clear an outcome
    Given I have created a plugin meal titled "Curry" for date "2099-01-06"
    When I call the plugin endpoint PUT /outcomes/:meal_id with body:
      """
      { "status": "as_planned" }
      """
    Then the plugin response status is 200
    And the outcome status is "as_planned"
    When I call the plugin endpoint DELETE /outcomes/:meal_id
    Then the plugin response status is 200
    And the plugin response contains deleted true

  # ── Ideas ───────────────────────────────────────────────────────────

  Scenario: List ideas returns an array
    When I call the plugin endpoint GET /ideas
    Then the plugin response status is 200
    And the plugin response contains an "ideas" array

  Scenario: Propose an idea and list it back
    When I call the plugin endpoint POST /ideas with body:
      """
      { "title": "Homemade pizza" }
      """
    Then the plugin response status is 201
    And the plugin response contains an idea with title "Homemade pizza"
    When I call the plugin endpoint GET /ideas
    Then the "ideas" array includes an item titled "Homemade pizza"

  Scenario: Delete an idea
    Given I have proposed a plugin idea titled "Boring soup"
    When I delete the plugin idea
    Then the plugin response status is 200
    And the plugin response contains deleted true

  # ── Events ──────────────────────────────────────────────────────────

  Scenario: List events returns an array
    When I call the plugin endpoint GET /events
    Then the plugin response status is 200
    And the plugin response contains an "events" array

  Scenario: Create an event with extra headcount
    When I call the plugin endpoint POST /events with body:
      """
      { "event_name": "Parents visiting", "date": "2099-01-07", "extra_adults": 2 }
      """
    Then the plugin response status is 201
    And the plugin response contains an event named "Parents visiting"

  Scenario: Update an event
    Given I have created a plugin event named "Test event" on date "2099-01-08"
    When I call the plugin endpoint PATCH /events/:id with body:
      """
      { "event_name": "Updated event" }
      """
    Then the plugin response status is 200
    And the plugin response contains an event named "Updated event"

  Scenario: Delete an event
    Given I have created a plugin event named "Disposable event" on date "2099-01-09"
    When I delete the plugin event
    Then the plugin response status is 200
    And the plugin response contains deleted true

  # ── Shopping list ────────────────────────────────────────────────────

  Scenario: Shopping list returns an array
    When I call the plugin endpoint GET /shopping-list
    Then the plugin response status is 200
    And the plugin response contains a "shopping_list" array

