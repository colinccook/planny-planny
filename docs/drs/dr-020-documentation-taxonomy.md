# DR-020: Searchable documentation taxonomy

- **Status:** Active
- **Decided:** 2026-09
- **Theme:** #DocumentationTaxonomy
- **Supersedes:** — (extends, but does not replace, DR-019)

## Context

DR-019 made product behaviour discoverable by putting a PascalCase
`@FeatureName` tag on every Gherkin feature. Decision records and UI components
did not have equivalent, memorable search keys, and Vitest files did not carry
the product-feature tags used by BDD. Finding all the documentation and tests
for one concern therefore still required knowing the repository layout.

## Decision

The repository uses three case-sensitive, PascalCase markers:

1. `@FeatureName` identifies product behaviour, such as
   `@ClaudeIntegration`.
2. `#DecisionRecordTheme` identifies the architectural decision that governs
   code or a test, such as `#ContinuousIntegration`.
3. `!UiComponent` identifies a rendered UI component or user-facing surface,
   such as `!HouseholdSwitcher`.

The authoritative indexes are [`docs/features.md`](../features.md),
[`docs/drs.md`](../drs.md), and
[`docs/ui-components.md`](../ui-components.md). Documentation uses the markers
when referring to indexed concepts. Every test file starts with its applicable
markers: exactly one `@FeatureName`, one or more decision-record themes, and
one or more UI components when the test renders or drives those components.
Markers that do not apply are omitted rather than invented.

Gherkin retains its executable `@FeatureName` tag and places the other markers
in a comment directly below it. TypeScript test files put all applicable
markers in a leading `//` comment. The markers are metadata for repository
search; only the Gherkin `@FeatureName` is interpreted by the test runner.

## Alternatives considered

- **Use directories and file names only.** Pros: no metadata. Cons: one feature
  crosses directories and test styles, while shared UI components serve many
  features, so paths cannot represent the relationships.
- **Use only Gherkin `@` tags for all three dimensions.** Pros: native parser
  support. Cons: decision records and UI components become indistinguishable
  from product features, and TypeScript tests still need comment metadata.
- **Maintain indexes without marking tests.** Pros: fewer changed files. Cons:
  the indexes cannot provide a direct lookup from a concept to all its test
  evidence and drift is harder to spot.
- **Add a custom manifest or tagging tool.** Pros: machine-enforced schema.
  Cons: unnecessary tooling and maintenance for identifiers that ordinary
  GitHub code search can already discover.

## Consequences

- Readers can start from any of the three indexes and search the repository for
  a marker to find related documentation and tests.
- New tests and documentation must reuse canonical markers from the indexes;
  new concepts update the relevant index in the same change.
- A test can name several decision themes or UI components, but only one
  primary product feature.
- Renaming a marker is a repository-wide documentation change because search
  keys are intentionally stable public vocabulary.
