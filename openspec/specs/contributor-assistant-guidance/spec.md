# Contributor assistant guidance

## Motivation

The existing CLAUDE.md provides useful repository knowledge, but GitHub Copilot
contributors need an instruction file in Copilot's recognized repository
location. Supporting both tools avoids favoring one contributor workflow.

## Requirements

- `.github/copilot-instructions.md` MUST provide actionable repository guidance
  for GitHub Copilot, including coding conventions, verification, and review scope.
- `CLAUDE.md` MUST remain available. Shared architecture and OpenSpec-format
  guidance MUST stay consistent between the entry points.
- README documentation MUST explain the purpose of both files and why Copilot
  support is additive rather than a replacement.
- Contributor instructions MUST NOT be interpreted as runtime viewer
  configuration or change how OpenSpec project context is loaded.
- This documentation-only feature MUST be usable independently of workspace
  discovery and suggestion prompt wording.

## Scenario

A contributor using GitHub Copilot receives repository instructions from
`.github/copilot-instructions.md`. A contributor using Claude retains the
existing CLAUDE.md entry point. Neither contributor needs to migrate runtime
project files or select a particular assistant in the viewer.
