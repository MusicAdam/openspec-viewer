# Dependency security maintenance

## Motivation

The checked-in dependency versions and transitive lockfile contain known
advisories and stale tooling. Routine maintenance should reduce those findings
without coupling upgrades to unrelated viewer features or silently introducing
major-version migrations or suppressing findings without fixing their cause.

## Requirements

- Update compatible direct and transitive dependency versions and commit the
  reproducible npm lockfile.
- Keep the existing direct-dependency major versions and declared Node.js engine
  requirement unless a separate migration explicitly changes them.
- Do not force unrelated major upgrades or add unverified transitive overrides
  to conceal remaining advisories.
- Keep published lockfile URLs portable; do not require a contributor-specific
  registry or commit registry credentials.
- Validate a clean locked install, backend/frontend compilation, and the original
  viewer's project, specification, change, file-rendering and WebSocket APIs.
- Report the actual audit outcome, including remaining advisories and unavailable
  fixes. Do not equate an audit finding with confirmed application exploitability.
- This maintenance MUST be independently reviewable from workspace discovery,
  prompt behavior and contributor-assistant instructions.

## Remaining dependency-chain remediation

Static serving MUST use the maintained sender without retaining the vulnerable
static/glob/minimatch chain. It MUST preserve GET, HEAD, conditional requests,
ranges and the application's SPA fallback. Invalid paths, traversal, dotfiles,
outside-root links and non-missing-file errors MUST NOT fall through to the SPA.
It MUST NOT enable directory listings or expose unknown API/WebSocket paths.

The local deepmerge fork MUST retain the upstream API, license and provenance,
identify itself as a distinct maintained package, and reject `__proto__` keys
before either target or source values are read. It MUST preserve the Svelte
plugin's array-replacement behavior, nested merges, enumerable symbols, functions
and special objects. Its actual use by the tooling MUST be reproducible from the
lockfile and covered by the frontend build.

The fork and required runtime files MUST be included in the packed npm artifact.
The package MUST install and run without relying on the source checkout or
postinstall mutations. Replace the fork with a verified upstream fix when one is
available; do not remove it merely because a plugin's major version changes.

## Verification outcome

On 2026-11-02 compatible upgrades reduced npm audit findings from 25 to 6, and
the explicit dependency-chain replacements reduced them to zero. This does not
prove the absence of application vulnerabilities or audit unpublished local
code; the security and compatibility regressions are mandatory.
