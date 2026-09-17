import { McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
const id = z.string().uuid()
const optionalText = z.string().trim().min(1).max(2_000).optional()
const nullableText = z.string().nullable()

const todo = z.object({
  id,
  title: z.string(),
  note: nullableText,
  date: date.nullable(),
  completed_on: date.nullable(),
  completed_at: z.string().nullable(),
})

const meal = z.object({
  id,
  title: z.string(),
  description: nullableText,
  date,
})

const outcome = z.object({
  meal_id: id,
  status: z.enum(['as_planned', 'did_not_happen']),
  reason: nullableText,
  note: nullableText,
  meal_plans: z.object({
    date,
    title: z.string(),
  }).nullable().optional(),
})

const idea = z.object({
  id,
  title: z.string(),
  description: nullableText,
  date: date.nullable(),
})

const event = z.object({
  id,
  date,
  end_date: date.nullable(),
  event_name: nullableText,
  extra_adults: z.number().int(),
  extra_children: z.number().int(),
  extra_babies: z.number().int(),
})

const shoppingItem = z.object({
  name: z.string(),
  starred: z.boolean(),
  meal_count: z.number().int().nonnegative(),
  meals: z.array(z.object({ title: z.string(), date })),
})

const readOnly = {
  readOnlyHint: true,
  openWorldHint: false,
  destructiveHint: false,
} as const

const createsData = {
  readOnlyHint: false,
  openWorldHint: false,
  destructiveHint: false,
} as const

const changesData = {
  readOnlyHint: false,
  openWorldHint: false,
  destructiveHint: true,
} as const

const oauthMeta = {
  securitySchemes: [{ type: 'oauth2', scopes: [] }],
} as const

export const CHATGPT_TOOL_DEFINITIONS = [
  {
    name: 'list_todos',
    title: 'List household todos',
    description: 'List open or completed todo items in the active Planny Planny household.',
    inputSchema: z.object({ completed: z.boolean().optional() }),
    outputSchema: z.object({ todos: z.array(todo) }),
    annotations: readOnly,
    _meta: oauthMeta,
  },
  {
    name: 'create_todo',
    title: 'Create household todo',
    description: 'Create a todo item in the active Planny Planny household.',
    inputSchema: z.object({
      title: z.string().trim().min(1).max(200),
      date: date.optional(),
      note: optionalText,
    }),
    outputSchema: z.object({ todo }),
    annotations: createsData,
    _meta: oauthMeta,
  },
  {
    name: 'update_todo',
    title: 'Update household todo',
    description: 'Change the title, due date, or note of an existing household todo.',
    inputSchema: z.object({
      id,
      title: z.string().trim().min(1).max(200).optional(),
      date: date.nullable().optional(),
      note: z.string().max(2_000).nullable().optional(),
    }),
    outputSchema: z.object({ todo }),
    annotations: changesData,
    _meta: oauthMeta,
  },
  {
    name: 'complete_todo',
    title: 'Complete household todo',
    description: 'Mark an existing household todo as completed.',
    inputSchema: z.object({ id, completed_on: date.optional() }),
    outputSchema: z.object({ todo }),
    annotations: createsData,
    _meta: oauthMeta,
  },
  {
    name: 'reopen_todo',
    title: 'Reopen household todo',
    description: 'Mark a completed household todo as open again.',
    inputSchema: z.object({ id }),
    outputSchema: z.object({ todo }),
    annotations: createsData,
    _meta: oauthMeta,
  },
  {
    name: 'delete_todo',
    title: 'Delete household todo',
    description: 'Permanently delete an existing household todo.',
    inputSchema: z.object({ id }),
    outputSchema: z.object({ deleted: z.literal(true) }),
    annotations: changesData,
    _meta: oauthMeta,
  },
  {
    name: 'list_meals',
    title: 'List planned meals',
    description: 'List meals in the active household for an optional date range.',
    inputSchema: z.object({ from: date.optional(), to: date.optional() }),
    outputSchema: z.object({ meals: z.array(meal) }),
    annotations: readOnly,
    _meta: oauthMeta,
  },
  {
    name: 'create_meal',
    title: 'Plan a meal',
    description: 'Add a meal to the active household meal plan.',
    inputSchema: z.object({
      title: z.string().trim().min(1).max(200),
      date: date.optional(),
      description: optionalText,
    }),
    outputSchema: z.object({ meal }),
    annotations: createsData,
    _meta: oauthMeta,
  },
  {
    name: 'update_meal',
    title: 'Update planned meal',
    description: 'Change the title, date, or description of a planned meal.',
    inputSchema: z.object({
      id,
      title: z.string().trim().min(1).max(200).optional(),
      date: date.optional(),
      description: z.string().max(2_000).nullable().optional(),
    }),
    outputSchema: z.object({ meal }),
    annotations: changesData,
    _meta: oauthMeta,
  },
  {
    name: 'copy_meal',
    title: 'Copy planned meal',
    description: 'Copy an existing planned meal to another date without removing the original.',
    inputSchema: z.object({ id, target_date: date }),
    outputSchema: z.object({ meal }),
    annotations: createsData,
    _meta: oauthMeta,
  },
  {
    name: 'move_meal',
    title: 'Move planned meal',
    description: 'Move an existing planned meal to another date and remove it from the original date.',
    inputSchema: z.object({ id, target_date: date }),
    outputSchema: z.object({ meal }),
    annotations: changesData,
    _meta: oauthMeta,
  },
  {
    name: 'delete_meal',
    title: 'Delete planned meal',
    description: 'Permanently delete a meal from the household plan.',
    inputSchema: z.object({ id }),
    outputSchema: z.object({ deleted: z.literal(true) }),
    annotations: changesData,
    _meta: oauthMeta,
  },
  {
    name: 'list_meal_outcomes',
    title: 'List meal outcomes',
    description: 'List whether planned household meals happened for an optional date range.',
    inputSchema: z.object({ from: date.optional(), to: date.optional() }),
    outputSchema: z.object({ outcomes: z.array(outcome) }),
    annotations: readOnly,
    _meta: oauthMeta,
  },
  {
    name: 'record_meal_outcome',
    title: 'Record meal outcome',
    description: 'Record whether a planned meal happened and optionally why it did not.',
    inputSchema: z.object({
      meal_id: id,
      status: z.enum(['as_planned', 'did_not_happen']),
      reason: z.enum(['no_shopping', 'ate_out', 'unexpected_event', 'didnt_fancy_it', 'other']).optional(),
      note: optionalText,
    }),
    outputSchema: z.object({ outcome }),
    annotations: changesData,
    _meta: oauthMeta,
  },
  {
    name: 'clear_meal_outcome',
    title: 'Clear meal outcome',
    description: 'Remove the recorded outcome from a planned meal.',
    inputSchema: z.object({ meal_id: id }),
    outputSchema: z.object({ deleted: z.literal(true) }),
    annotations: changesData,
    _meta: oauthMeta,
  },
  {
    name: 'list_meal_ideas',
    title: 'List meal ideas',
    description: 'List recent meal ideas in the active household.',
    inputSchema: z.object({}),
    outputSchema: z.object({ ideas: z.array(idea) }),
    annotations: readOnly,
    _meta: oauthMeta,
  },
  {
    name: 'create_meal_idea',
    title: 'Create meal idea',
    description: 'Add a meal idea to the active household.',
    inputSchema: z.object({
      title: z.string().trim().min(1).max(200),
      description: optionalText,
      date: date.optional(),
    }),
    outputSchema: z.object({ idea }),
    annotations: createsData,
    _meta: oauthMeta,
  },
  {
    name: 'delete_meal_idea',
    title: 'Delete meal idea',
    description: 'Permanently delete an existing meal idea.',
    inputSchema: z.object({ id }),
    outputSchema: z.object({ deleted: z.literal(true) }),
    annotations: changesData,
    _meta: oauthMeta,
  },
  {
    name: 'list_events',
    title: 'List household events',
    description: 'List visitor and schedule events for an optional date range.',
    inputSchema: z.object({ from: date.optional(), to: date.optional() }),
    outputSchema: z.object({ events: z.array(event) }),
    annotations: readOnly,
    _meta: oauthMeta,
  },
  {
    name: 'create_event',
    title: 'Create household event',
    description: 'Create a visitor or schedule event in the active household.',
    inputSchema: z.object({
      date,
      end_date: date.optional(),
      event_name: optionalText,
      extra_adults: z.number().int().optional(),
      extra_children: z.number().int().optional(),
      extra_babies: z.number().int().optional(),
    }),
    outputSchema: z.object({ event }),
    annotations: createsData,
    _meta: oauthMeta,
  },
  {
    name: 'update_event',
    title: 'Update household event',
    description: 'Change an existing visitor or schedule event.',
    inputSchema: z.object({
      id,
      date: date.optional(),
      end_date: date.nullable().optional(),
      event_name: z.string().max(2_000).nullable().optional(),
      extra_adults: z.number().int().optional(),
      extra_children: z.number().int().optional(),
      extra_babies: z.number().int().optional(),
    }),
    outputSchema: z.object({ event }),
    annotations: changesData,
    _meta: oauthMeta,
  },
  {
    name: 'delete_event',
    title: 'Delete household event',
    description: 'Permanently delete an existing visitor or schedule event.',
    inputSchema: z.object({ id }),
    outputSchema: z.object({ deleted: z.literal(true) }),
    annotations: changesData,
    _meta: oauthMeta,
  },
  {
    name: 'get_shopping_list',
    title: 'Get upcoming ingredients',
    description: 'List ingredients used by planned meals in an optional date range.',
    inputSchema: z.object({ from: date.optional(), to: date.optional() }),
    outputSchema: z.object({ shopping_list: z.array(shoppingItem) }),
    annotations: readOnly,
    _meta: oauthMeta,
  },
] as const

export type ChatGptToolName = (typeof CHATGPT_TOOL_DEFINITIONS)[number]['name']

const TOOL_ALIASES: Partial<Record<ChatGptToolName, string>> = {
  list_meal_outcomes: 'list_outcomes',
  record_meal_outcome: 'upsert_outcome',
  clear_meal_outcome: 'delete_outcome',
  list_meal_ideas: 'list_ideas',
  create_meal_idea: 'create_idea',
  delete_meal_idea: 'delete_idea',
}

function toolSummary(toolName: ChatGptToolName, result: Record<string, unknown>): string {
  const collection = Object.values(result).find(Array.isArray)
  if (collection) {
    return `${toolName} returned ${collection.length} item${collection.length === 1 ? '' : 's'}.`
  }
  return `${toolName} completed successfully.`
}

export function createChatGptMcpServer(
  execute: (toolName: string, args: Record<string, unknown>) => Promise<unknown>,
): McpServer {
  const server = new McpServer(
    { name: 'Planny Planny', version: '2.0.0' },
    {
      instructions:
        'Use the active Planny Planny household. Confirm before destructive changes. Read current records before updating or deleting them.',
    },
  )

  for (const definition of CHATGPT_TOOL_DEFINITIONS) {
    server.registerTool(
      definition.name,
      {
        title: definition.title,
        description: definition.description,
        inputSchema: definition.inputSchema,
        outputSchema: definition.outputSchema,
        annotations: definition.annotations,
        _meta: definition._meta,
      },
      async (args) => {
        const executorName = TOOL_ALIASES[definition.name] ?? definition.name
        const rawResult = await execute(
          executorName,
          args as Record<string, unknown>,
        )
        const result = definition.outputSchema.parse(rawResult)

        return {
          structuredContent: result,
          content: [{ type: 'text', text: toolSummary(definition.name, result) }],
        }
      },
    )
  }

  return server
}
