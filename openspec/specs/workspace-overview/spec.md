# Workspace overview

## Motivation

Developers with multiple repositories need to find and switch between OpenSpec
projects without restarting the viewer. Discovery must be portable and must not
assume a particular user's drive layout.

## Requirements

### Default workspace discovery

A launch without a positional directory MUST open `/overview.html` and search
the current working directory recursively. `--root` MUST allow an alternative
workspace root. An explicit positional OpenSpec directory MUST still open that
project directly and remain selectable in the overview.

### Recognition and scan boundaries

An `openspec` directory MUST qualify when it contains a `specs` directory, a
`changes` directory, or a `config.yaml` file. `project.md` MUST NOT be required.
`config.yaml` MUST NOT be interpreted as viewer configuration.

Discovery MUST skip dependency, Git, common build/cache, and virtual-environment
directories. It MUST NOT follow directory links or descend into recognized
OpenSpec directories. Unreadable locations MUST be reported without discarding
projects discovered elsewhere.

### Project selection and navigation

The overview MUST show project names and relative folder hierarchies, support
filtering by name or folder, and provide a Refresh projects action that rescans
the workspace. Loading, empty, filtered-empty, and error states MUST be visible.
Every project view MUST provide an Overview link back to the overview. This link
MUST be the rightmost navigation item, after Search, rather than between the
project name and its Dashboard, Specs, and Changes navigation.

### Cached discovery and explicit refresh

A nonempty discovered project list MUST be cached for the lifetime of the viewer
server. Revisiting or reloading the overview MUST reuse this list without
scanning the workspace. An empty list MUST be scanned again on the next overview
request without requiring a manual refresh.

Refresh projects MUST explicitly rescan the workspace and replace the cache on
success. Existing project cards MUST remain visible during refresh. A failed
refresh MUST report the error and retain the last successful result. The
displayed scan timestamp MUST be the time of discovery, not of cache retrieval.
Concurrent scan requests MUST share an in-flight scan. Restarting the viewer
server MAY clear the cache.

### Project isolation

API requests, rendered change files, live updates, and saved suggestions MUST
remain scoped to the URL-selected project. Independent browser tabs MUST NOT
change each other's selected project. Unknown project IDs MUST NOT permit
opening arbitrary filesystem paths.

Only opened projects MUST have file watchers. Returning to the overview MUST NOT
require watching every directory in the workspace.

## Scenarios

- Given two nested repositories and an excluded dependency tree, discovery lists
  the repositories but not copies inside dependencies.
- Given a configuration-only OpenSpec directory without project.md, it appears
  in the overview and opens with the existing missing-project-context warning.
- Given a newly added project, Refresh projects lists it without restarting.
- Given a nonempty cached list, revisiting the overview preserves the same
  projects and scan time until Refresh projects is used.
- Given an empty overview, adding a project and revisiting discovers it
  automatically.
- Given a refresh failure, the previously discovered projects remain available
  and the error is displayed.
- Given two tabs viewing changes with the same name in different projects,
  their content, live updates, and persisted suggestions remain separate.
- Given an explicit test-openspec path, the project opens directly and the
  overview remains available.
