# DR-010: Agentic skills

- **Status:** Active
- **Decided:** 2026-09
- **Theme:** agentic-skills

## Context

AI agents do most of the work in this repository. They need standing
instructions that are small enough to load into context, and pointers to
deeper material they can pull in only when relevant.

## Decision

**Agent instructions live in `.github/copilot-instructions.md` and
`AGENTS.md`, kept short and index-shaped: they state the rules and *link*
to the walkthrough series ([`docs/walkthrough/`](../walkthrough/README.md))
and the decision-records index ([`docs/drs.md`](../drs.md)) instead of
duplicating them.** The DR index is the lookup table agents consult before
making architectural choices; each linked DR carries the pros and cons so
agents don't re-litigate settled decisions.

## Alternatives considered

| Option | Pros | Cons | Verdict |
| --- | --- | --- | --- |
| **Short instructions + indexed deep docs** | Small always-on context; one source of truth per topic; humans read the same docs | Requires disciplined link maintenance | ✅ Chosen |
| **One giant instruction file** | Everything in one place | Wastes context window on irrelevant topics; duplicates the human docs; rots quickly | ❌ Rejected |
| **No standing instructions** | Zero maintenance | Agents rediscover conventions the hard way — or invent conflicting ones | ❌ Rejected |

## Consequences

- The layout itself is a recorded decision:
  [dr-014-readme-and-agent-instructions](dr-015-readme-and-agent-instructions.md).
- When a new capability area appears (e.g. sound effects), it gets a
  section in the walkthrough or a guide in `docs/`, and the instructions
  gain one link — not an essay.
