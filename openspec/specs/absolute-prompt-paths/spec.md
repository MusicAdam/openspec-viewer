# Absolute paths in suggestion prompts

## Motivation

Different projects commonly use the same change names and files such as
proposal.md. A relative filename is not enough for a coding assistant to identify
the intended project reliably.

## Requirements

- Every generated prompt MUST include the absolute change-directory path.
- Located suggestions MUST reference the source file's absolute filesystem path
  and preserve its one-based line number when the exact line is identifiable.
- Source resolution MUST compare rendered selectable Markdown blocks when inline
  formatting, links or HTML entities prevent a literal source-text match.
- Ambiguous matches across files MUST NOT guess a filename. Repeated or nested
  blocks MAY identify a unique file without inventing a line number.
- Formatted suggestions MUST survive unrelated live updates while their
  original rendered text still exists.
- Spec deltas MUST use their actual `specs/<capability>/spec.md` source path,
  including active or archived change directories as appropriate.
- The backend MUST supply spec-delta absolute paths so the browser does not
  reconstruct platform-specific filesystem paths.
- If original text cannot be located, the prompt MUST state that the file is
  unidentified rather than inventing a path.
- This behavior MUST work with Windows and POSIX paths and MUST NOT depend on
  workspace discovery or a particular assistant.

## Scenarios

- Two projects with a change called add-login and a proposal.md generate distinct
  absolute file references for identical suggestion text.
- A suggestion in an authentication spec delta references the full
  `specs/authentication/spec.md` path rather than `specs/authentication.md`.
- An unmatched suggestion retains the absolute change-directory context and
  explicitly reports the missing file location.
