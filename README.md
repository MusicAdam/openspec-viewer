# OpenSpec Viewer

Interactive browser viewer for OpenSpec directories.

## Installation

```bash
npm install -g openspec-viewer
```

Requires Node.js >= 20.0.0

## Usage

```bash
openspec-viewer [path] [options]
```

### Examples

```bash
openspec-viewer                    # Discover projects under the working directory
openspec-viewer --root ./workspace # Discover projects under another directory
openspec-viewer ./my-project/openspec # Open one OpenSpec directory directly
openspec-viewer --port 8080        # Custom port
openspec-viewer --no-open          # Don't auto-open browser
```

### Options

| Option | Description |
|--------|-------------|
| `-p, --port <port>` | Port to run server on (default: 3000) |
| `--root <path>` | Workspace to search recursively (default: current working directory) |
| `--no-open` | Don't open browser automatically |
| `-V, --version` | Display version |
| `-h, --help` | Display help |

## Features

- Live file watching with auto-refresh
- Markdown and HTML rendering
- Task progress tracking with checkbox parsing
- Search across all content
- Dark mode UI
- Folder-based tab grouping for change files
- Workspace overview with searchable project folders and manual rediscovery

### Workspace overview

Developers often work across several repositories. Previously, switching projects
required restarting the viewer with another path. A no-path launch now opens
`http://localhost:3000/overview.html`, where each project card shows its folder
hierarchy relative to the workspace root. Filter by name or folder, select a
project, and use **Overview**, at the far right after Search, from any project
view to return.

The workspace is the directory where you launch the command, not a hardcoded
drive. For example, launching from `D:\` searches that drive; launching from
another workspace on Windows, macOS, or Linux searches that workspace instead.
Use `--root` to choose another root without changing your working directory.

Discovery looks recursively for an `openspec` directory containing a `specs`
directory, a `changes` directory, or a `config.yaml` file. It stops descending
inside recognized OpenSpec directories, skips Git metadata, dependencies, common
build/cache directories, virtual environments, and directory links, and reports
unreadable locations in the overview. **Refresh projects** performs a new scan,
including projects created since the previous scan. Large workspaces can take time.

The viewer caches a nonempty project list in memory for as long as the server
runs. Returning to the overview or reloading the page reuses that list without
scanning again. If the list is empty, the next overview request searches
automatically. Only **Refresh projects** replaces an existing nonempty list;
previous cards remain visible during refresh and after a failed refresh. The
displayed scan time reflects the actual discovery, not the latest page visit.
Restarting the server clears this cache.

`config.yaml` is a discovery marker only; the viewer still reads Markdown files,
not YAML configuration. Missing `project.md` is allowed. Explicit directory
arguments remain supported, including directories not named `openspec` (such as
the bundled `test-openspec` fixture), and are included in the overview.

Project selection is part of the URL, so separate tabs can view different
projects without changing each other's data or live updates. Saved suggestions
are scoped by project and change name; old unscoped suggestions are not assigned
to a project automatically. Only opened projects are watched, not the entire
workspace. The overview discovers projects on demand rather than continuously
watching the filesystem.

This feature is independent of assistant-specific prompt wording and repository
contribution instructions, so maintainers can review it separately.

## Development

```bash
npm ci
npm run build
npm test
npm run typecheck
```

`npm run dev` still opens the bundled single-project fixture. To exercise
workspace discovery after building, use `npm start -- --root <workspace>`.

## OpenSpec Format

[OpenSpec](https://github.com/Fission-AI/OpenSpec) is a specification-driven development framework:

- `project.md` - Project conventions
- `specs/` - Current specifications
- `changes/` - Change proposals with `proposal.md`, `tasks.md`, `design.md`
- `changes/archive/` - Completed changes with date prefix

### Change Directory Structure

Each change can contain:

| File/Folder | Description |
|-------------|-------------|
| `proposal.md` | Change proposal and rationale |
| `tasks.md` | Implementation checklist (supports `- [ ]` checkboxes) |
| `design.md` | Technical design documentation |
| `specs/` | Spec delta files showing ADDED/MODIFIED/REMOVED requirements |
| `<folder>/` | Any subfolder becomes its own tab with grouped files |

## License

MIT
