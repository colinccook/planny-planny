# DR-011: Recommended MCPs

- **Status:** Active
- **Decided:** 2026-09
- **Theme:** recommend-mcps

## Context

Agents working in this repo consult library documentation constantly
(React 19, Tailwind v4, Supabase, TanStack Query, Playwright…). Training
data lags behind releases — sometimes by major versions.

## Decision

**Always use the context7 MCP server for the latest documentation** when
working with any library or framework in this stack. Resolve the library
through context7 before writing code against an API you half-remember.

## Alternatives considered

| Option | Pros | Cons | Verdict |
| --- | --- | --- | --- |
| **context7 MCP** | Up-to-date, version-specific docs pulled into context on demand | External dependency on the MCP server being configured | ✅ Chosen |
| **Rely on training data** | Zero setup | Stale APIs (Tailwind v4 and React 19 both changed significantly); hallucinated options | ❌ Rejected |
| **Fetch docs sites ad hoc** | Current | Slow, unstructured, easy to skip; no consistent workflow | ❌ Rejected |

## Consequences

- Agent instructions reference this DR so every session starts with the
  expectation: *check context7 before assuming an API*.
