# TypeScript, in depth

This chapter teaches you the TypeScript you need to work on Planny Planny,
from zero. **Everything below is a feature this codebase actually uses** —
each concept comes with a real file you can open to see it in the wild.
(Why we chose TypeScript at all, and what we rejected, is a decision
record: [`dr-004-frontend.md`](../drs/dr-004-frontend.md).)

TypeScript is JavaScript plus type annotations. The compiler checks the
annotations and then erases them — the browser only ever runs plain
JavaScript. If the compiler is unhappy, our build (`npm run build`, which
runs `tsc -b`) fails before anything ships.

## 1. Basic type annotations

A `:` after a name says what kind of value it may hold:

```ts
function greet(name: string): string {
  return `Hello, ${name}`
}
```

- `name: string` — the parameter must be a string.
- `: string` after the parentheses — the function returns a string.

The primitive types you'll use constantly are `string`, `number` and
`boolean`. When a function returns nothing, its return type is `void`.

## 2. Object shapes: `type` and `interface`

Two ways to name the shape of an object. We use both; they're mostly
interchangeable.

```ts
// A type alias — a name for a shape.
type Meal = {
  id: string
  title: string
  description: string | null   // can be a string OR null
}

// An interface — like a type alias, but extendable.
interface Household {
  id: string
  default_adults: number
}
```

Real examples: `interface AccessLevelInfo` in
[`src/lib/permissions.ts`](../../src/lib/permissions.ts) describes one
access level (key, label, capability list); row shapes like `MealPlanRow`
are aliased from the generated schema types in
[`src/hooks/useMealPlans.ts`](../../src/hooks/useMealPlans.ts).

**`?:` marks an optional property** — `profile?: string` means the property
may be missing entirely (its type is really `string | undefined`).

## 3. Unions and literal types

A `|` makes a union: "one of these". Combined with string literals it
gives you a safe, compiler-checked enum — and that's how we model roles:

```ts
// src/lib/permissions.ts
export type Role = 'owner' | 'member' | 'honoured_guest' | 'voting_guest'
```

Now `const r: Role = 'guest'` is a **compile error**. This is why the
permissions module can be tested exhaustively: the type system knows the
complete list of roles.

**Narrowing.** When a value is a union, you check which member it is
before using member-specific behaviour. `typeof` is the most common guard
— [`src/lib/sounds.ts`](../../src/lib/sounds.ts) uses
`if (typeof window === 'undefined') return null` to survive server-side
rendering, and [`src/components/ingredients/IngredientsList.tsx`](../../src/components/ingredients/IngredientsList.tsx)
uses a `switch` statement to narrow the `SortOption` union one case at a
time. TypeScript tracks these checks: after them, the value is "narrowed"
to the branch you proved.

## 4. Generics

A generic is a type parameter the *caller* fills in — written `<T>`. The
classic teaching example:

```ts
function first<T>(items: T[]): T | undefined {
  return items[0]
}
const meal: Meal | undefined = first<Meal>([])
```

Real uses in this repo:

- `pickInitialHousehold<T extends { id: string }>` in
  [`src/lib/householdSelection.ts`](../../src/lib/householdSelection.ts) —
  "works for any type `T`, **as long as it has an `id: string`**". The
  `extends` clause is a *constraint*.
- `useSwipe<T extends HTMLElement>` in
  [`src/hooks/useSwipe.ts`](../../src/hooks/useSwipe.ts) — a generic React
  hook, so the returned ref is typed as the exact element you attach it to
  (`HTMLDivElement`, `HTMLLIElement`, …) instead of a vague `HTMLElement`.
- The library generics you call daily without thinking about it:
  `useQuery<MealPlan[]>`, `useState<string>('')`.

## 5. Utility types: `Pick`, `Partial`, `Record`

TypeScript ships built-in type transforms. Three we use:

```ts
// Pick — build a smaller shape from a bigger one.
// src/pages/PublicHouseholdPage.tsx: the public share view only exposes
// a handful of columns, and the type says so.
type PublicMealPlan = Pick<MealPlanRow, 'id' | 'household_id' | 'date' | 'title' | 'description'>

// Partial — every property becomes optional. Perfect for "patch" updates.
// src/hooks/useTodos.ts: a rename only sends { title }, a reschedule only { date }.
patch: Partial<TodoItem>

// Record — an object with keys of type K and values of type V.
// src/hooks/useMealOutcomes.ts: a label for every possible reason.
export const OUTCOME_REASON_LABELS: Record<MealOutcomeReason, string> = { ... }
```

`Record<MealOutcomeReason, string>` is worth a second look: because the
key type is the *union of all reasons*, the compiler guarantees the labels
object can't miss one. Add a new reason to the union and the build fails
until you add its label.

## 6. `import type`

```ts
// src/pages/PublicHouseholdPage.tsx
import type { Database } from '../types/database'
```

`import type` imports **only** the types — the import is erased at
compile time and produces no JavaScript. It makes "this is a type-only
dependency" explicit and keeps the bundle clean.

## 7. The escape hatches: `null`, `unknown`, `!`, and why not `any`

- **`string | null`** — an honest "may be absent" (e.g. a meal's optional
  `description`).
- **`unknown`** — "could be anything; you must check before using it".
  The type-safe cousin of `any`.
- **`value!`** — a non-null assertion: "trust me, this isn't null". We use
  it sparingly; prefer a real `if` check, which *narrows* the type
  honestly.
- **`any`** — turns off type checking for that value. **Project
  convention: no `any`.** Strict mode (`tsconfig.app.json`) plus this rule
  is what keeps the compiler useful.

## 8. `as const` — pinning literal types

Without help, TypeScript widens `['a', 'b']` to `string[]`. `as const`
freezes the exact literals and makes the value readonly:

```ts
// src/components/layout/TabBar.tsx — the tab list is a fixed literal tuple,
// so the compiler can check every place a tab id is used.
const TABS = [ ... ] as const
```

You'll also see it in [`src/lib/queryKeys.ts`](../../src/lib/queryKeys.ts)
and in tests (`complexity: 'easy' as const` in
`MealPromptGenerator.test.ts`) where a literal must satisfy a union type.

## 9. Everyday syntax you'll read constantly

These are JavaScript features, but they're everywhere in our TypeScript:

```ts
// Destructuring — unpack properties into variables (src/hooks/useHousehold.tsx)
const { user } = useAuth()
const { households, memberships, isLoading } = useMemberships()

// Nullish coalescing — fall back only when the left side is null/undefined
// (src/hooks/useMealPlans.ts — Supabase can hand back `data: null`)
return (data ?? []) as MealPlanWithIngredients[]

// async/await — asynchronous code that reads top-to-bottom
// (src/hooks/useIngredients.ts)
const { data, error } = await supabase.from('ingredients').select('*')
if (error) throw error
```

Note the pattern in that last snippet: Supabase calls **return errors,
they don't throw** — so every call site checks `if (error) throw error`,
which converts it into a real exception that TanStack Query's error
handling (and TypeScript's control flow) can work with.

## 10. The generated database types — our favourite TypeScript trick

[`src/types/database.ts`](../../src/types/database.ts) is a large,
**machine-generated** file describing the entire Postgres schema as
TypeScript types. Reading into it gives you the exact shape of any row:

```ts
type MealPlanRow = Database['public']['Tables']['meal_plans']['Row']
// → { id: string; household_id: string; date: string; title: string; ... }
```

This is a chain of *indexed access types*: `Database` → its `public`
schema → its `Tables` → the `meal_plans` table → its `Row` shape. The
payoff: if a migration renames a column and you forget to regenerate,
**the build fails** until you run `supabase gen types typescript` —
the frontend can never silently drift from the schema. Never hand-edit
this file.

## Conventions recap

- **Strict mode on, no `any`.** Type-check with `npx tsc -b --noEmit`
  (CI runs this in the `lint` job).
- Unions of string literals over enums; `Pick`/`Partial`/`Record` over
  re-declaring shapes by hand; `import type` for type-only imports.
- Regenerate `src/types/database.ts` after changing any migration.

Next: [React](react.md)
