# OpenSpec Viewer

Interactive browser viewer for OpenSpec directories.

## Installation

```bash
npm install -g openspec-viewer
```

## Usage

```bash
# View OpenSpec directory in current folder
openspec-viewer

# View specific directory
openspec-viewer ./path/to/openspec

# Use custom port
openspec-viewer --port 8080

# Don't auto-open browser
openspec-viewer --no-open
```

### Options

```
-p, --port <port>    Port to run the server on (default: 3000)
--no-open            Don't open browser automatically
-h, --help           Display help
-V, --version        Display version
```

## Features

- Live file watching with auto-refresh via WebSocket
- Markdown rendering for specs, changes, and proposals
- Task progress tracking with checkbox parsing
- Search across all content
- Dark mode UI

## OpenSpec Format

OpenSpec is a specification-driven development framework with:

- `project.md` - Project conventions and overview
- `specs/` - Current specifications (what IS built)
- `changes/` - Proposals for changes (what SHOULD change)
  - `proposal.md`, `tasks.md`, `design.md`
  - `specs/` subdirectory with delta changes (ADDED/MODIFIED/REMOVED)
- `changes/archive/` - Completed changes with date prefix

## Requirements

- Node.js >= 20.0.0

## Development

```bash
npm install
npm run dev          # Run server + frontend with hot reload
npm run build        # Build for production
```

## Tech Stack

- **Backend**: Fastify, ws (WebSocket), chokidar (file watching)
- **Frontend**: Svelte 5, Tailwind CSS
- **Build**: TypeScript, Vite

## License

MIT
