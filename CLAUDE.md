# OpenSpec Viewer

Interactive browser viewer for OpenSpec directories.

## Project Structure

```
openspec-viewer/
├── bin/openspec-viewer.js    # CLI entry point
├── src/                      # Backend TypeScript source
│   ├── cli/                  # CLI argument parsing
│   ├── server/               # Fastify server + WebSocket
│   ├── watcher/              # chokidar file watching
│   ├── parser/               # OpenSpec markdown parsing
│   └── shared/               # Shared types
├── frontend/                 # Svelte frontend
│   └── src/
│       ├── components/       # Svelte components
│       ├── stores/           # Svelte stores
│       └── lib/              # Utilities
├── dist/                     # Built backend (gitignored)
└── dist-frontend/            # Built frontend (gitignored)
```

## Development

```bash
npm install
npm run dev          # Run both server and frontend in dev mode
npm run build        # Build for production
```

## Tech Stack

- **Backend**: Fastify, ws (WebSocket), chokidar (file watching)
- **Frontend**: Svelte 5, Tailwind CSS
- **Build**: TypeScript, Vite

## Code Conventions

- Use TypeScript strict mode
- Use ES modules (type: "module")
- Prefer async/await over callbacks
- Keep components small and focused

## OpenSpec Format

OpenSpec is a specification-driven development framework with:
- `project.md` - Project conventions
- `specs/` - Current specifications (what IS built)
- `changes/` - Proposals for changes (what SHOULD change)
  - `proposal.md`, `tasks.md`, `design.md`
  - `specs/` subdirectory with delta changes (ADDED/MODIFIED/REMOVED)
- `changes/archive/` - Completed changes with date prefix
