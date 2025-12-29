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
- Markdown rendering for specs, changes, and proposals
- **HTML mockup rendering** - View interactive HTML mockups directly in the viewer
- Task progress tracking with checkbox parsing
- Search across all content
- Dark mode UI
- Grouped tab navigation for change files

## HTML Mockups Support

The viewer supports rendering HTML files alongside markdown in your change directories. This is perfect for:

- **UI/UX mockups** - Interactive prototypes with full CSS/JS support
- **Design documentation** - Visual specifications with styling
- **Component demos** - Live examples of UI components

### How it works

Simply add `.html` files anywhere in your change directory:

```
changes/add-login-feature/
├── proposal.md           # Proposal tab
├── tasks.md              # Tasks tab
├── design.md             # Design tab
├── mockups/              # Mockups tab (grouped)
│   ├── login-form.html   # Interactive mockup
│   └── error-states.html # Another mockup
└── specs/
    └── auth/spec.md      # Spec Deltas tab
```

HTML files are rendered in a sandboxed iframe with full styling support. Files in subdirectories (like `mockups/`) are automatically grouped into their own tab.

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
| `mockups/` | HTML/Markdown mockups and visual documentation |
| `*.md`, `*.html` | Any additional documentation files |

## License

MIT
