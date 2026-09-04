# DR-015: README and agent instructions layout

- **Status:** Active
- **Decided:** 2026-09
- **Theme:** readme-and-agent-instructions

## Context

The README had grown into a 400-line wall mixing purpose, feature
announcements, setup, deployment, architecture and a file tree; docs were
scattered flat in `docs/` with overlapping audiences (humans learning the
stack vs. agents needing rules). Both audiences were poorly served.

## Decision

**Four document layers, each with one audience and one job:**

| Layer | Audience | Job |
| --- | --- | --- |
| `README.md` | Humans (first contact) | State this is a prototype, its purpose, the highest-level features, how to run it locally, and where to read more |
| `docs/walkthrough/*.md` | Humans learning the stack | A maintained series of in-depth walkthroughs of how each chosen technology works, referencing real code in this repo |
| `docs/drs/{n}-{theme}.md` + `docs/drs.md` | Agents (and humans) deciding | Append-only decision records, one per theme; `drs.md` is a strictly maintained index table — latest DR per theme + a one-sentence summary of what was chosen and why |
| `.github/copilot-instructions.md` + `AGENTS.md` | Agents working | Short, index-shaped rules that link into the layers above |

Supporting rules:

- **Feature/setup guides** (permissions, outcomes, public access, ChatGPT
  plugin, skeletons, BDD testing) stay as single-purpose files in `docs/`
  — the walkthrough explains *technologies*; guides explain *this app's
  features*.
- **DRs are never edited.** A changed decision is a new DR; `drs.md` is
  updated to point at it.
- The README links onward instead of duplicating: one table row per doc
  area.

## Alternatives considered

| Option | Pros | Cons | Verdict |
| --- | --- | --- | --- |
| **Layered: README → walkthroughs → DRs → instructions** | Each audience gets exactly its depth; single source of truth per topic; index files keep agents oriented | Four places to keep tidy (mitigated: each has one job and they link, not duplicate) | ✅ Chosen |
| **Monolithic README** | One file to find | The failure mode being fixed: unreadable for humans, unusable as agent context | ❌ Rejected |
| **Wiki instead of repo docs** | Easy editing | Detached from code; rots; not reviewable in PRs | ❌ Rejected |
| **ADR tools (log4brains etc.)** | Tooling around ADRs | Extra dependency for what a table and a directory already do | ❌ Rejected |

## Consequences

- This DR is the reference when someone proposes restructuring docs again:
  append a new DR, update [`docs/drs.md`](../drs.md), don't mutate this one.
