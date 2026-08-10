Feature: ChatGPT MCP Endpoint
  The MCP Streamable-HTTP endpoint (POST /sse) lets ChatGPT's
  "New Plugin" form connect to Planny Planny via the Model Context
  Protocol (2024-11-05 spec).  It supports initialize, tools/list,
  and tools/call — with full RLS enforcement on tool calls.

  Background:
    Given I am signed in as an owner of a household for the plugin

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

  Scenario: tools/call without authentication returns a 401 with a WWW-Authenticate challenge
    When I call MCP tool "list_todos" without authentication
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

