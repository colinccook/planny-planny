# DR-019: Product-feature tags on BDD features

- **Status:** Active
- **Decided:** 2026-09
- **Theme:** feature-tags
- **Supersedes:** — (first DR on this theme)

## Context

The BDD suites (integration and component) have grown to dozens of
`.feature` files spread across directories that reflect *pages and
mechanisms* (`calendar/`, `layout/`, `settings/`) rather than *product
features*. There was no reliable way to answer "show me every test that
proves the ChatGPT plugin works" or to link from the README's feature
showcase to the evidence that the feature is tested. Directory names
alone can't do this: one product feature (e.g. household sharing) spans
several directories and both suites, and one directory (e.g.
`calendar/`) contains several product features.

## Decision

Every product feature gets a **PascalCase feature name**, and every
Gherkin `.feature` file is tagged with exactly one `@FeatureName` tag on
the line above `Feature:` — for example `@ChatGPTPlugin`,
`@ClaudeIntegration`, `@HouseholdSharing`, `@MealCalendar`.

Concretely:

1. **Tags, not file names.** File and directory names are unchanged;
   the tag is the single source of the product-feature grouping.
2. **One primary tag per file**, matching the product feature the file
   proves. New feature files must carry their tag from day one.
3. **Discoverable by search.** Because the tag is a unique literal
   string, a GitHub code search for `"@FeatureName"` in this repository
   finds every scenario for the feature — no tooling required.
4. **README links to features.** The README showcase may reference a
   feature as `@FeatureName`, hyperlinked to a short feature document in
   `docs/features/`, which in turn links to the GitHub search for the
   tag so readers can jump straight to the tests.

Current feature names: `AIMealSuggestions`, `Authentication`,
`ChatGPTPlugin`, `ClaudeIntegration`, `Headcounts`, `HouseholdSharing`,
`Households`, `Ingredients`, `MealCalendar`, `MealOutcomes`,
`MobileLayout`, `Permissions`, `PlanStreak`, `Reactions`,
`StoreCupboard`, `Todos`.

## Alternatives considered

- **Rename files/directories per feature.** Pros: visible in the file
  tree. Cons: churns git history, breaks step-file conventions, can't
  express a feature spanning both suites, and renames are exactly what
  behaviour-describing test names are meant to avoid.
- **A hand-maintained mapping document.** Pros: no test-file changes.
  Cons: drifts immediately; tags live beside the scenarios they
  describe and are validated by being executable Gherkin.
- **Playwright `grep`/project-level grouping.** Pros: runnable subsets.
  Cons: config-only, invisible in the feature files themselves, and
  doesn't help documentation link to tests. (Tags remain compatible
  with tag-based filtering in playwright-bdd if ever wanted.)

## Consequences

- Every new `.feature` file must start with its `@FeatureName` tag;
  new product features add a name to the list above via a new DR-019
  successor or the feature's own doc.
- The README showcase can cite `@FeatureName` links backed by
  `docs/features/` pages and GitHub tag searches.
- Tags are inert at runtime today (nothing filters on them), so
  adopting them changed no test behaviour.
