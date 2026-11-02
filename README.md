# OpenSpec Viewer

Interactive browser viewer for OpenSpec directories.

## Contributing with coding assistants

[.github/copilot-instructions.md](.github/copilot-instructions.md) provides
repository instructions discoverable by GitHub Copilot.
[CLAUDE.md](CLAUDE.md) remains in place for Claude users and shared project
architecture and OpenSpec-format guidance.

Both entry points describe the same contributor workflow. Adding Copilot support
does not replace Claude support, change the viewer at runtime, or require either
assistant. These files guide contributors; the viewer's project context still
comes from `project.md`, not `CLAUDE.md` or Copilot instructions. This
documentation-only feature can be reviewed independently of project discovery
and prompt labels.

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
