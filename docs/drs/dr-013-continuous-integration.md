# DR-013: Continuous integration

- **Status:** Active
- **Decided:** 2026-04 (project inception); PR-gate split 2026-09
- **Theme:** continuous-integration

## Context

A prototype maintained largely by AI agents needs an automatic quality
gate so no human has to remember to run anything. Pipelines must cover
code going into `main`.

## Decision

**GitHub Actions, always.** Two workflows:

- **`.github/workflows/pr-tests.yml`** — on every pull request into
  `main`: install, then the fast Vitest unit suite.
- **`.github/workflows/ci-deploy.yml`** — on pushes to `main`: lint +
  type-check, component BDD, integration BDD (against a real Supabase
  container booted in the job), and Lighthouse accessibility, all in
  parallel; only when all are green does the deploy chain run.

Standing rule: **every unit, integration and end-to-end test runs in
pipelines covering `main`; a red pipeline blocks deploy.** Flakes are
treated as bugs, not retried into acceptance.

## Alternatives considered

| Option | Pros | Cons | Verdict |
| --- | --- | --- | --- |
| **GitHub Actions** | Lives next to the code; free for public repos; Supabase CLI and Playwright have first-class actions | Vendor coupling to GitHub (already chosen for hosting) | ✅ Chosen |
| **GitLab CI / CircleCI** | Powerful | Second platform to mirror code and secrets to | ❌ Rejected |
| **Pre-push hooks only** | Zero infra | "On my machine" is not a gate; agents don't reliably run hooks | ❌ Rejected |
| **Run the full BDD matrix on every PR too** | Maximum early signal | Minutes of Supabase boot + browser cost per push; unit tests already catch PR-level breakage, and `main` runs everything before deploy | ❌ Rejected (kept under review) |

## Consequences

- CI job details and how to reproduce them locally:
  [`docs/walkthrough/bdd-testing.md`](../walkthrough/bdd-testing.md#ci).
