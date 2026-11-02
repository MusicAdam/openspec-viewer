# Locally maintained deepmerge compatibility fork

This is **not an upstream release**. OpenSpec Viewer owns this private local
package and its security maintenance. It retains the public API and MIT license
of `deepmerge@4.3.1`, including the original type declarations and distribution
implementation.

## Provenance and security change

- Upstream: https://github.com/TehShrike/deepmerge
- Original release: `v4.3.1`, commit
  `5b87756a5671635679001cbac72aa42f23472c81`.
- Advisory: https://github.com/advisories/GHSA-gcqx-w48m-w2h4
- Patch reference: https://github.com/TehShrike/deepmerge/pull/286,
  unmerged head `9add7d91abb595703679faf7b7942bbe7f87642b`.

The only implementation change from the published CommonJS distribution is in
`getKeys()`: discard the string key `__proto__` before either the target-copy or
source-copy loop reads values. Filtering only `propertyIsUnsafe()` is insufficient
because the target-copy loop does not call it.

The distinct package name/version identifies an actual maintained fork, not a
fabricated patched upstream version. The root npm dependency override routes
the Svelte tooling's `deepmerge` requests to this checked-in implementation.
There is no postinstall mutation or registry download for this package.

## Maintenance

Run `npm test` and the frontend build after changing the implementation or Svelte
plugin. Regressions cover poisoned targets and sources, ignored getters, nested
objects, symbols, and the plugin's array-replacement behavior.

When upstream publishes a verified fix, remove the local dependency and override,
reinstall from the lockfile, and rerun the security and compatibility checks.
Do not delete the override merely because the plugin's major version changes:
the replacement must actually stop using the affected implementation.
