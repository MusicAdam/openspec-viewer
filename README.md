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
