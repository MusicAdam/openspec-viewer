# Graphical Markdown diagrams

## Motivation

OpenSpec changes and specifications can include Mermaid flowcharts, relationship
diagrams and sequence diagrams. Showing only their fenced source makes those
documents harder to review.

## Requirements

- The shared Markdown viewer MUST render fenced `mermaid` blocks graphically,
  including when they appear in project context, changes, specs or spec deltas.
- Other fences and plain-text diagrams MUST retain their existing code rendering.
- Assets MUST be bundled locally and loaded on demand, without sending diagram
  source to a rendering service or requiring a CDN.
- Every diagram MUST retain its original source and offer zoom/reset controls.
  Full screen MUST be available when supported by the browser.
- A render failure MUST visibly identify the error and expand the unchanged
  source without blocking other diagrams or the remainder of the document.
- Diagram rendering MUST use strict security settings that diagram directives
  cannot relax. HTML labels and click callbacks MUST remain disabled.
- Rendering MUST preserve original suggestion-block identifiers and source text.
  Diagram controls MUST remain usable in suggestion mode.
- Content refreshes and view changes MUST render the current content only;
  obsolete asynchronous renders MUST NOT overwrite newer content or other views.
- This feature MUST remain independently reviewable from workspace discovery,
  prompt wording, contributor instructions and dependency maintenance.
