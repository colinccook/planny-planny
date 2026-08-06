# Repository Agent Instructions

## Dependency Updates

- Upgrade runtimes, frameworks, tools, and dependencies only to their latest published Long-Term Support (LTS) release when the project provides an LTS channel.
- Do not upgrade to Current, preview, prerelease, release-candidate, beta, alpha, canary, nightly, or experimental releases.
- If a project does not designate LTS releases, use the latest stable release that is compatible with this repository's LTS runtime and the rest of the supported toolchain.
- Prefer the newest security-supported release within the selected LTS line.
- Do not force an update past peer-dependency or engine constraints. Keep the latest compatible stable version and document the constraint in the pull request.
- Update runtime declarations, local version files, CI configuration, lockfiles, and developer documentation together so they specify the same LTS line.
- Run the repository's complete existing test, lint, type-check, build, and audit commands after updates, and fix compatibility regressions before opening a pull request.
