# OpenSpec Viewer

Interactive browser viewer for OpenSpec directories.

## Requirements

- Node.js >= 20.0.0

## Installation

```bash
npm install
```

## Development

Run both the server and frontend in development mode with hot reloading:

```bash
npm run dev
```

Or run them separately:

```bash
# Backend only
npm run dev:server

# Frontend only
npm run dev:frontend
```

## Production Build

```bash
npm run build
```

This builds both the server and frontend for production.

## Usage

### As a local tool

```bash
# Start the viewer for an OpenSpec directory
npm start -- /path/to/openspec-directory

# Or after building
node dist/cli/index.js /path/to/openspec-directory
```

### As an npx command (after publishing)

```bash
npx openspec-viewer /path/to/openspec-directory
```

### Options

```
-p, --port <port>    Port to run the server on (default: 3000)
-o, --open           Open browser automatically
-h, --help           Display help
```

## OpenSpec Format

OpenSpec is a specification-driven development framework with:

- `project.md` - Project conventions and overview
- `specs/` - Current specifications (what IS built)
- `changes/` - Proposals for changes (what SHOULD change)
  - `proposal.md`, `tasks.md`, `design.md`
  - `specs/` subdirectory with delta changes (ADDED/MODIFIED/REMOVED)
- `changes/archive/` - Completed changes with date prefix

## Tech Stack

- **Backend**: Fastify, ws (WebSocket), chokidar (file watching)
- **Frontend**: Svelte 5, Tailwind CSS
- **Build**: TypeScript, Vite

## License

MIT
