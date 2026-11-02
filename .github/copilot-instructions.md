# OpenSpec Viewer contributor instructions

This repository is a local, browser-based viewer for OpenSpec directories.
GitHub Copilot should follow these instructions when proposing or editing code.
See [CLAUDE.md](../CLAUDE.md) for the shared project layout, OpenSpec format, and
file-rendering conventions; keep guidance consistent rather than replacing
support for other assistants.

## Implementation conventions

- Use strict TypeScript and ES modules with async/await.
- Follow the existing Fastify backend, Svelte 5 frontend, and Tailwind patterns.
- Keep changes focused, reuse existing helpers, and avoid unnecessary dependencies.
- Keep filesystem behavior portable across Windows, macOS, and Linux. Do not
  hardcode a contributor's drive, workspace, or preferred coding assistant.
- Preserve explicit single-directory viewing and existing rendering behavior
  unless the feature deliberately changes it.
- When changing specified behavior, update the related files under
  `openspec/specs/` alongside the implementation. `test-openspec/` is example
  viewer input, not a substitute for documenting feature requirements.
- Do not add assistant-service calls to local viewing or prompt-generation
  workflows unless explicitly requested.

## Development and verification

Use the checked-in npm lockfile. Run `npm ci` to restore missing dependencies,
`npm run typecheck` for backend types, and `npm run build` for backend and
frontend compilation. Run the test scripts available in `package.json` for
behavior changes. Document existing warnings separately from new failures.

`npm run dev` uses the bundled `test-openspec` fixture. Inspect `package.json`
before changing scripts or assuming a new tool is available.

## Reviewability

Explain the user problem, the reason for the change, and compatibility decisions
in the commit or pull request. Keep independent features in separate commits so
maintainers can accept them individually. Do not mix unrelated dependency
upgrades or pre-existing issue fixes into a feature.
