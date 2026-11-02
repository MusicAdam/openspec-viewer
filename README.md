# OpenSpec Viewer

Interactive browser viewer for OpenSpec directories.

## Installation

```bash
npm install -g openspec-viewer
```

Requires Node.js >= 20.0.0

### Dependency maintenance

The dependency refresh updates packages and the lockfile within the existing
direct-dependency major versions. It preserves the declared Node.js requirement
and does not bundle a framework, styling-system, or TypeScript major migration.
Install reproducibly with `npm ci`; validate with `npm run build` and
`npm run typecheck`.

The npm audit check on 2026-11-02 decreased from 25 findings (including 2 critical
and 15 high) to 6: no critical, 1 high, 2 moderate, and 3 low. This is not a
clean-audit claim or a determination of application exploitability.
`@fastify/static` and its `glob`/`minimatch` chain still have advisories whose
suggested fix crosses a direct-dependency major version.
The Svelte Vite plugin/inspector and `deepmerge` chain still has low-severity
findings for which npm reports no available fix. These require separately
reviewed follow-up work rather than a forced upgrade or an unverified override.

## Usage

```bash
openspec-viewer [path] [options]
```

### Examples

```bash
openspec-viewer                    # Current directory
openspec-viewer ./my-project       # Specific directory
openspec-viewer --port 8080        # Custom port
openspec-viewer --no-open          # Don't auto-open browser
```

### Options

| Option | Description |
|--------|-------------|
| `-p, --port <port>` | Port to run server on (default: 3000) |
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
