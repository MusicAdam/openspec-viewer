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

## Suggestion prompts

Use **Generate Prompt** in the suggestions panel to collect review feedback,
preview it, and copy it into GitHub Copilot, Claude, or another coding assistant.
The generated text is assistant-neutral; no assistant integration or account is
required, and generating a prompt does not send your files to an external service.

The button and preview title deliberately avoid naming a particular assistant:
the existing prompt format already works across assistants. This wording-only
feature preserves suggestion content and the clipboard flow,
and can be reviewed independently of workspace discovery.

Prompts include the absolute change-directory path once. Each located source file
uses a path relative to that directory, with its line number when known:
`proposal.md`, `diagrams.md`, or `specs/authentication/spec.md`. This disambiguates
projects and nested files without repeating the complete root for every suggestion.
If the original text cannot
be located, the prompt says so rather than inventing a filename. Prompts can
contain local directory names; review them before sharing with an assistant.

Source lookup also matches the rendered text of Markdown blocks, including
inline code, emphasis, links and entities. Unrelated live updates keep those
suggestions. If several files match, no filename is guessed; a uniquely
identified file can be included without a line number when its precise line
cannot be established.

Contributors can run the focused prompt regressions with `npm test` after
`npm ci`. `npm run build` checks both the backend and frontend. These checks do
not require the workspace overview feature.

## License

MIT
