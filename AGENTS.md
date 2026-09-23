# Repository Agent Instructions

## Repository documentation markers

- Start discovery from the canonical [`@Features`](docs/features.md),
  [`#DecisionRecords`](docs/drs.md), and
  [`!UiComponents`](docs/ui-components.md) indexes.
- Reuse the indexed, case-sensitive PascalCase marker spellings in
  documentation and tests.
- Every test file names exactly one `@Feature`, its applicable
  `#DecisionRecord` themes, and any `!UiComponent` it renders or drives.
- Add new concepts to the relevant index in the same change that introduces
  them.

## Dependency Updates

- Upgrade runtimes, frameworks, tools, and dependencies only to their latest published Long-Term Support (LTS) release when the project provides an LTS channel.
- Do not upgrade to Current, preview, prerelease, release-candidate, beta, alpha, canary, nightly, or experimental releases.
- If a project does not designate LTS releases, use the latest stable release that is compatible with this repository's LTS runtime and the rest of the supported toolchain.
- Prefer the newest security-supported release within the selected LTS line.
- Do not force an update past peer-dependency or engine constraints. Keep the latest compatible stable version and document the constraint in the pull request.
- Update runtime declarations, local version files, CI configuration, lockfiles, and developer documentation together so they specify the same LTS line.
- Run the repository's complete existing test, lint, type-check, build, and audit commands after updates, and fix compatibility regressions before opening a pull request.
