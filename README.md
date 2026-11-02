# OpenSpec Viewer

Interactive browser viewer for OpenSpec directories.

## Installation

```bash
npm install -g openspec-viewer
```

Requires Node.js >= 20.0.0

### Dependency maintenance

The dependency refresh updates packages and the lockfile while preserving the
declared Node.js requirement. It does not bundle unrelated framework, styling,
or TypeScript major migrations. Install reproducibly with `npm ci`; validate
with `npm run build`, `npm run typecheck`, and `npm test`.

Compatible updates initially reduced npm audit findings from 25 to 6. Because
upgrading the affected plugins still retained vulnerable transitive dependencies,
the remaining chains are addressed explicitly:

- Static assets use a small Fastify plugin built on `@fastify/send`, the sender
  already used by the old static plugin. It preserves GET/HEAD, conditional and
  range requests, and the SPA fallback without depending on `@fastify/static`,
  `glob`, or `minimatch`. It rejects traversal, alternate separators, dotfiles,
  and links outside the frontend root; rejected paths do not use the SPA fallback.
- Svelte configuration merging uses a checked-in, MIT-licensed compatibility
  fork with the concrete upstream prototype-poisoning patch. This is a distinctly
  named local package, not a fictional patched upstream release. Its npm override
  is backed by security and API-compatibility regressions, not an audit exclusion.
  See [the fork's provenance and maintenance guide](vendor/deepmerge/README.md).

The npm audit check on 2026-11-02 reports **zero findings** after these changes.
This is not a claim that the entire application has no vulnerabilities: npm does
not audit unpublished local code. The fork's patch and the static-serving
boundaries therefore have explicit regression tests. The project owns the local
fork until a verified upstream fix can replace it.

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
