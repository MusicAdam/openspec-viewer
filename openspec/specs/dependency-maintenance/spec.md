# Compatible dependency maintenance

## Motivation

The checked-in dependency versions and transitive lockfile contain known
advisories and stale tooling. Routine maintenance should reduce those findings
without coupling upgrades to unrelated viewer features or silently introducing
major-version migrations.

## Requirements

- Update compatible direct and transitive dependency versions and commit the
  reproducible npm lockfile.
- Keep the existing direct-dependency major versions and declared Node.js engine
  requirement unless a separate migration explicitly changes them.
- Do not force major upgrades or add unverified transitive overrides to conceal
  remaining advisories.
- Keep published lockfile URLs portable; do not require a contributor-specific
  registry or commit registry credentials.
- Validate a clean locked install, backend/frontend compilation, and the original
  viewer's project, specification, change, file-rendering and WebSocket APIs.
- Report the actual audit outcome, including remaining advisories and unavailable
  fixes. Do not equate an audit finding with confirmed application exploitability.
- This maintenance MUST be independently reviewable from workspace discovery,
  prompt behavior and contributor-assistant instructions.

## Deferred follow-up

As of 2026-11-02, compatible updates reduce npm audit findings from 25 to 6.
The remaining static-server dependency chain requires separately evaluated
major-version changes; the low-severity Svelte plugin/deepmerge chain has no
available npm-reported fix. Framework, styling and TypeScript major migrations
are outside this compatible-update proposal.
