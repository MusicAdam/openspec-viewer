# Assistant-neutral suggestion prompts

## Motivation

Review suggestions are useful to GitHub Copilot, Claude, and other coding
assistants. Naming only Claude in the UI incorrectly suggests that this existing
copy-and-paste workflow requires a particular assistant.

## Requirements

- The suggestions action MUST be labeled Generate Prompt.
- The preview MUST be titled Generated Prompt.
- Generated instructions MUST remain assistant-neutral and preserve the existing
  suggestion content, available file references, and clipboard workflow.
- Prompt generation MUST remain local and MUST NOT invoke an assistant service.
- This feature MUST NOT depend on workspace discovery or require a new dependency.

## Scenario

Given a developer reviewing a change with saved suggestions, selecting Generate
Prompt opens the existing preview. The developer can copy the same feedback into
GitHub Copilot or Claude without changing the viewer's configuration.
