import type { Suggestion } from '../stores/suggestions';

/**
 * Generate a Claude prompt with all suggestions for a change proposal
 */
export function generatePrompt(
  changeName: string,
  proposalContent: string,
  suggestions: Suggestion[]
): string {
  const suggestionBlocks = suggestions
    .map(
      (suggestion, index) => `### Suggestion ${index + 1}
**Original text:**
> ${suggestion.originalText}

**Suggested change:**
${suggestion.suggestedChange}`
    )
    .join('\n\n');

  return `I'm reviewing the proposal for "${changeName}" and have the following suggestions:

## Current Proposal Content
\`\`\`markdown
${proposalContent}
\`\`\`

## My Suggestions

${suggestionBlocks}

---

Please incorporate these suggestions into an updated version of the proposal. Return the complete updated proposal in markdown format.`;
}
