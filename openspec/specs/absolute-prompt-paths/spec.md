# Absolute paths in suggestion prompts

## Motivation

Different projects commonly use the same change names and files such as
proposal.md. An absolute change directory combined with relative file references
identifies the intended project without repeating its root in each suggestion.

## Requirements

- Every generated prompt MUST include the absolute change-directory path.
- Located suggestions MUST reference the source file relative to the change directory
  and preserve its one-based line number when the exact line is identifiable.
- File references MUST retain subdirectories and MUST NOT repeat the absolute
  change-directory path.
- Source resolution MUST compare rendered selectable Markdown blocks when inline
  formatting, links or HTML entities prevent a literal source-text match.
- Ambiguous matches across files MUST NOT guess a filename. Repeated or nested
  blocks MAY identify a unique file without inventing a line number.
- Formatted suggestions MUST survive unrelated live updates while their
  original rendered text still exists.
- Spec deltas MUST use their actual `specs/<capability>/spec.md` source path,
  including active or archived change directories as appropriate.
- The backend MUST supply spec-delta absolute paths for source identification
  and deduplication; displayed references MUST remain relative.
- If original text cannot be located, the prompt MUST state that the file is
  unidentified rather than inventing a path.
- This behavior MUST work with Windows and POSIX paths and MUST NOT depend on
  workspace discovery or a particular assistant.

## Scenarios

- Two projects with a change called add-login generate distinct absolute change
  directories and the same relative proposal.md reference for identical text.
- notes/proposal.md and examples/proposal.md retain their subdirectories.
- A suggestion in an authentication spec delta references the full
  `specs/authentication/spec.md` path rather than `specs/authentication.md`.
- An unmatched suggestion retains the absolute change-directory context and
  explicitly reports the missing file location.
