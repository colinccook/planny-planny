Feature: ChatGPT MCP Endpoint
  The current MCP Streamable HTTP endpoint at /mcp lets ChatGPT
  connect through Supabase Auth OAuth 2.1. The legacy /sse endpoint
  remains temporarily available while existing connections migrate.

  Background:
    Given I am signed in as an owner of a household for the plugin

  # ── Current MCP endpoint and OAuth discovery ──────────────────────────

  Scenario: The current MCP endpoint challenges an unauthenticated client
    When I initialize the current MCP endpoint without authentication
    Then the MCP response status is 401
    And the current MCP response advertises its protected resource metadata

  Scenario: The current MCP protected resource metadata uses Supabase Auth
    When I request the current MCP protected resource metadata
    Then the discovery response status is 200
    And the discovery response identifies the current MCP resource
    And the discovery response identifies Supabase Auth as its authorization server

  Scenario: An approved Supabase OAuth grant can list current MCP tools
    When I authorize the current MCP endpoint through Supabase OAuth
    Then the MCP response is a valid JSON-RPC 2.0 result
    And the MCP result contains a tools array
    And the tools array includes a tool named "list_meals"

  Scenario: An honoured guest can call a current MCP tool
    Given I am signed in as an honoured guest of a household for the plugin
    When I call current MCP tool "list_todos" through Supabase OAuth with arguments:
      """
      {}
      """
    Then the MCP response is a valid JSON-RPC 2.0 result
    And the current MCP structured result contains a "todos" array

  Scenario: A voting guest cannot call a current MCP tool
    Given I am signed in as a voting guest of a household for the plugin
    When I call current MCP tool "list_todos" through Supabase OAuth with arguments:
      """
      {}
      """
    Then the MCP tool response reports an access level denial

  Scenario: Current MCP tools honour their persisted schema contracts
    When I exercise the schema-sensitive current MCP tools
    Then the current MCP tools honour their persisted schema contracts

  # ── MCP lifecycle — no auth required ─────────────────────────────────

  Scenario: initialize returns server capabilities without authentication
    When I send an MCP initialize request
    Then the MCP response is a valid JSON-RPC 2.0 result
    And the MCP result contains protocolVersion "2024-11-05"
    And the MCP result contains serverInfo name "Planny Planny"
    And the MCP result has a tools capability

  Scenario: tools/list returns all available tools without authentication
    When I send an MCP tools/list request
    Then the MCP response is a valid JSON-RPC 2.0 result
    And the MCP result contains a tools array
    And the tools array includes a tool named "list_todos"
    And the tools array includes a tool named "create_todo"
    And the tools array includes a tool named "list_meals"
    And the tools array includes a tool named "create_meal"
    And the tools array includes a tool named "get_shopping_list"

  Scenario: notifications/initialized returns 204 without authentication
    When I send an MCP notifications/initialized message
    Then the MCP response status is 204

  Scenario: Unknown MCP method returns method-not-found error
    When I send an MCP request for method "unknown/method"
    Then the MCP response is a valid JSON-RPC 2.0 error
    And the MCP error code is -32601

  Scenario: Invalid JSON body returns parse error
    When I send a malformed MCP request body
    Then the MCP response is a valid JSON-RPC 2.0 error
    And the MCP error code is -32700

  # ── tools/call — auth required ────────────────────────────────────────

  Scenario: tools/call without authentication returns unauthorised error
    When I call MCP tool "list_todos" without authentication
    Then the MCP response is a valid JSON-RPC 2.0 error
    And the MCP error code is -32001

  Scenario: A voting guest cannot call a legacy MCP tool
    Given I am signed in as a voting guest of a household for the plugin
    When I call MCP tool "list_todos" with arguments:
      """
      {}
      """
    Then the MCP response is a valid JSON-RPC 2.0 error
    And the MCP error code is -32003

  Scenario: tools/call without authentication returns a 401 with a WWW-Authenticate challenge
    When I call MCP tool "list_todos" without authentication
    Then the MCP response status is 401
    And the MCP response has a WWW-Authenticate header pointing at the protected resource metadata

  Scenario: A plain unauthenticated GET on the MCP endpoint also returns a WWW-Authenticate challenge
    When I send a plain GET request to the MCP endpoint without authentication
    Then the MCP response status is 401
    And the MCP response has a WWW-Authenticate header pointing at the protected resource metadata

  # ── OAuth discovery — RFC 9728 (protected resource metadata) ───────────

  Scenario: The protected resource metadata endpoint is discoverable without authentication
    When I request the MCP protected resource metadata
    Then the discovery response status is 200
    And the discovery response contains a "resource" field
    And the discovery response contains an "authorization_servers" array

  Scenario: list_todos tool returns todos array
    When I call MCP tool "list_todos" with arguments:
      """
      {}
      """
    Then the MCP response is a valid JSON-RPC 2.0 result
    And the MCP tool result content contains a "todos" array

  Scenario: create_todo tool creates a todo
    When I call MCP tool "create_todo" with arguments:
      """
      { "title": "MCP test todo", "date": "2099-02-01" }
      """
    Then the MCP response is a valid JSON-RPC 2.0 result
    And the MCP tool result content contains a todo titled "MCP test todo"

  Scenario: create_todo tool without title returns error
    When I call MCP tool "create_todo" with arguments:
      """
      { "note": "No title" }
      """
    Then the MCP response is a valid JSON-RPC 2.0 error
    And the MCP error code is -32603

  Scenario: list_meals tool returns meals array
    When I call MCP tool "list_meals" with arguments:
      """
      {}
      """
    Then the MCP response is a valid JSON-RPC 2.0 result
    And the MCP tool result content contains a "meals" array

  Scenario: create_meal tool creates a meal
    When I call MCP tool "create_meal" with arguments:
      """
      { "title": "MCP pasta", "date": "2099-02-02" }
      """
    Then the MCP response is a valid JSON-RPC 2.0 result
    And the MCP tool result content contains a meal titled "MCP pasta"

  Scenario: list_ideas tool returns ideas array
    When I call MCP tool "list_ideas" with arguments:
      """
      {}
      """
    Then the MCP response is a valid JSON-RPC 2.0 result
    And the MCP tool result content contains an "ideas" array

  Scenario: get_shopping_list tool returns shopping_list array
    When I call MCP tool "get_shopping_list" with arguments:
      """
      {}
      """
    Then the MCP response is a valid JSON-RPC 2.0 result
    And the MCP tool result content contains a "shopping_list" array

  Scenario: complete and reopen a todo via MCP tools
    When I call MCP tool "create_todo" with arguments:
      """
      { "title": "MCP lifecycle todo", "date": "2099-02-03" }
      """
    Then the MCP response is a valid JSON-RPC 2.0 result
    When I call MCP tool "complete_todo" with the last created todo id
    Then the MCP response is a valid JSON-RPC 2.0 result
    And the MCP tool result todo has a completed_on date
    When I call MCP tool "reopen_todo" with the last created todo id
    Then the MCP response is a valid JSON-RPC 2.0 result
    And the MCP tool result todo has no completed_on date
