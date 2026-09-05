# DR-016: The README is a showcase

- **Status:** Active
- **Decided:** 2026-09
- **Theme:** readme-and-agent-instructions
- **Supersedes:** [dr-015](dr-015-readme-and-agent-instructions.md)

## Context

[dr-015](dr-015-readme-and-agent-instructions.md) fixed a 400-line wall of
a README by splitting docs into four layers, and framed the README's
audience simply as "humans (first contact)". That underspecified who those
humans actually are. Planny Planny will never be a mainstream open-source
project soliciting contributors; its real README readers are **friends,
curious colleagues, and potential employers** of the maintainer. They come
to be impressed and to understand, not to file issues.

Two things about this project are genuinely remarkable and were buried:

1. **It is entirely vibe coded.** Not a single line was written by hand —
   every feature, migration, test and doc was produced by AI agents under
   the maintainer's direction. The maintainer is openly proud of this, and
   of the fact that the CI safety net (100+ BDD scenarios, unit tests,
   lint, type-check, Lighthouse) makes confident change possible despite it.
2. **Realtime household collaboration** — a change on one phone appears on
   everyone else's instantly — is the most impressive *feature* to show
   off, more so than the app's nominal headline metric (outcomes).

## Decision

**The README's job is to show off the project to friends, colleagues and
potential employers.** Specifically:

- Lead with the **vibe-coded story** and the engineering discipline that
  makes it sustainable (CI gates, BDD suites, append-only migrations,
  strict TypeScript, layered docs). This is the project's most interesting
  claim; state it plainly and proudly.
- Showcase **realtime collaboration** as the flagship feature. The app's
  domain outcome (did the meal happen?) stays documented but is no longer
  the headline.
- Show off the **technology stack** and **maintainability** explicitly —
  concrete numbers (scenario counts, suites, pipeline stages) beat
  adjectives.
- The four-layer structure from dr-015 **remains in force** (README →
  walkthroughs → DRs → agent instructions; DRs append-only; README links
  onward instead of duplicating). Only the README's audience and tone
  change.
- Procedural content that dilutes the showcase (e.g. first-time deployment
  setup) moves to a single-purpose file in `docs/` and is linked from the
  README's documentation table.
- **Every user-facing feature change must keep the README's feature
  showcase current.** Agent instructions carry this rule so it is applied
  automatically.

## Alternatives considered

| Option | Pros | Cons | Verdict |
| --- | --- | --- | --- |
| **Showcase README for friends/colleagues/employers** | Matches the real audience; the vibe-coded story and realtime demo are the project's genuine differentiators; stays honest about prototype status | Slightly longer README (mitigated: procedural content moved out) | ✅ Chosen |
| **Keep the neutral "first contact" README of dr-015** | Already tidy | Buries the two most interesting facts about the project; reads like a generic OSS repo it will never be | ❌ Rejected |
| **Separate SHOWCASE.md / portfolio page** | README stays minimal | Nobody lands there; the README *is* the landing page | ❌ Rejected |
| **Downplay the vibe-coded origin** | Avoids scepticism from AI-wary readers | Dishonest by omission, and it's the point: the CI discipline exists precisely so AI-authored code can be trusted | ❌ Rejected |

## Consequences

- README rewritten as a showcase; deployment setup moved to
  [`docs/deployment.md`](../deployment.md).
- `.github/copilot-instructions.md` strengthened: user-facing changes must
  update the README's feature showcase, not merely "review it".
- Future restructuring proposals: append a new DR, don't mutate this one.
