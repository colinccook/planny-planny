// @ChatGPTPlugin #UnitTesting #Backend #ChatGptPlugin
import { describe, expect, it, vi } from 'vitest'
import { createMcpHandler } from '@modelcontextprotocol/server'
import { CHATGPT_TOOL_DEFINITIONS, createChatGptMcpServer } from './chatgptTools'

async function readMcpResponse(response: Response): Promise<unknown> {
  const text = await response.text()
  const dataLine = text.split('\n').find((line) => line.startsWith('data: '))
  return JSON.parse(dataLine ? dataLine.slice(6) : text)
}

describe('ChatGPT MCP tool definitions', () => {
  it('gives every tool complete publication metadata', () => {
    for (const tool of CHATGPT_TOOL_DEFINITIONS) {
      expect(tool.title).toBeTruthy()
      expect(tool.description).toBeTruthy()
      expect(tool.inputSchema).toBeTruthy()
      expect(tool.outputSchema).toBeTruthy()
      expect(tool.annotations).toEqual({
        readOnlyHint: expect.any(Boolean),
        openWorldHint: false,
        destructiveHint: expect.any(Boolean),
      })
      expect(tool._meta.securitySchemes).toEqual([{ type: 'oauth2', scopes: [] }])
    }
  })

  it('marks every delete, move, clear, or overwrite tool as destructive', () => {
    const destructiveTools = CHATGPT_TOOL_DEFINITIONS
      .filter((tool) => tool.annotations.destructiveHint)
      .map((tool) => tool.name)

    expect(destructiveTools).toEqual(expect.arrayContaining([
      'update_todo',
      'delete_todo',
      'update_meal',
      'move_meal',
      'delete_meal',
      'record_meal_outcome',
      'clear_meal_outcome',
      'delete_meal_idea',
      'update_event',
      'delete_event',
    ]))
  })

  it('uses separate tools for copying and moving a meal', () => {
    const names = CHATGPT_TOOL_DEFINITIONS.map((tool) => tool.name)

    expect(names).toContain('copy_meal')
    expect(names).toContain('move_meal')
  })

  it('rejects database-invalid todo and outcome inputs before execution', () => {
    const updateTodo = CHATGPT_TOOL_DEFINITIONS.find((tool) => tool.name === 'update_todo')
    const recordOutcome = CHATGPT_TOOL_DEFINITIONS.find(
      (tool) => tool.name === 'record_meal_outcome',
    )

    expect(updateTodo?.inputSchema.safeParse({
      id: 'eaed8f18-c9e8-4f01-a9fa-fab14486fd10',
      date: null,
    }).success).toBe(false)
    expect(recordOutcome?.inputSchema.safeParse({
      meal_id: 'eaed8f18-c9e8-4f01-a9fa-fab14486fd10',
      status: 'did_not_happen',
    }).success).toBe(false)
    expect(recordOutcome?.inputSchema.safeParse({
      meal_id: 'eaed8f18-c9e8-4f01-a9fa-fab14486fd10',
      status: 'did_not_happen',
      reason: 'other',
    }).success).toBe(false)
    expect(recordOutcome?.inputSchema.safeParse({
      meal_id: 'eaed8f18-c9e8-4f01-a9fa-fab14486fd10',
      status: 'as_planned',
      reason: 'ate_out',
    }).success).toBe(false)
  })

  it('allows signed household-size adjustments for events', () => {
    const createEvent = CHATGPT_TOOL_DEFINITIONS.find((tool) => tool.name === 'create_event')
    expect(createEvent?.inputSchema.safeParse({
      date: '2099-03-01',
      extra_adults: -1,
      extra_children: -2,
      extra_babies: 0,
    }).success).toBe(true)
  })

  it('advertises the complete metadata through the MCP transport', async () => {
    const handler = createMcpHandler(
      () => createChatGptMcpServer(async () => ({ todos: [] })),
    )
    const response = await handler.fetch(new Request('http://localhost/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      }),
    }))
    const body = await readMcpResponse(response) as {
      result: {
        tools: {
          name: string
          title?: string
          outputSchema?: unknown
          annotations?: Record<string, boolean>
          _meta?: { securitySchemes?: unknown[] }
        }[]
      }
    }
    const listTodos = body.result.tools.find((tool) => tool.name === 'list_todos')

    expect(listTodos?.title).toBe('List household todos')
    expect(listTodos?.outputSchema).toBeDefined()
    expect(listTodos?.annotations).toEqual({
      readOnlyHint: true,
      openWorldHint: false,
      destructiveHint: false,
    })
    expect(listTodos?._meta?.securitySchemes).toEqual([{ type: 'oauth2', scopes: [] }])
  })

  it('returns schema-matching structured content from tool calls', async () => {
    const handler = createMcpHandler(
      () => createChatGptMcpServer(async () => ({ todos: [] })),
    )
    const response = await handler.fetch(new Request('http://localhost/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: { name: 'list_todos', arguments: {} },
      }),
    }))
    const body = await readMcpResponse(response) as {
      result: { structuredContent?: { todos?: unknown[] }; content?: { text?: string }[] }
    }

    expect(body.result.structuredContent).toEqual({ todos: [] })
    expect(body.result.content?.[0]?.text).toBe('list_todos returned 0 items.')
  })

  it('dispatches moving a meal as its own operation', async () => {
    const execute = vi.fn(async () => ({
      meal: {
        id: 'eaed8f18-c9e8-4f01-a9fa-fab14486fd10',
        title: 'Curry',
        description: null,
        date: '2026-09-18',
      },
    }))
    const handler = createMcpHandler(() => createChatGptMcpServer(execute))
    const response = await handler.fetch(new Request('http://localhost/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'move_meal',
          arguments: {
            id: 'eaed8f18-c9e8-4f01-a9fa-fab14486fd10',
            target_date: '2026-09-18',
          },
        },
      }),
    }))

    expect(response.status).toBe(200)
    expect(execute).toHaveBeenCalledWith('move_meal', {
      id: 'eaed8f18-c9e8-4f01-a9fa-fab14486fd10',
      target_date: '2026-09-18',
    })
  })
})
