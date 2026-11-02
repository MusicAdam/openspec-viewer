import type { Suggestion } from '../stores/suggestions';
import type { Change } from './api';

interface SuggestionLocation {
  absolutePath: string;
  lineNumber: number;
}

/**
 * Find which file contains the original text and calculate line number
 */
function findSuggestionLocation(
  originalText: string,
  change: Change
): SuggestionLocation | null {
  // Search through all file groups
  for (const group of change.fileGroups) {
    for (const file of group.files) {
      if (file.type === 'markdown' && file.content) {
        const index = file.content.indexOf(originalText);
        if (index !== -1) {
          // Calculate line number
          const linesBeforeMatch = file.content.substring(0, index).split('\n');
          const lineNumber = linesBeforeMatch.length;

          return {
            absolutePath: file.absolutePath,
            lineNumber,
          };
        }
      }
    }
  }

  // Also check spec deltas
  for (const delta of change.specDeltas) {
    const index = delta.content.indexOf(originalText);
    if (index !== -1) {
      const linesBeforeMatch = delta.content.substring(0, index).split('\n');
      const lineNumber = linesBeforeMatch.length;

      return {
        absolutePath: delta.absolutePath,
        lineNumber,
      };
    }
  }

  return null;
}

/**
 * Generate an assistant-neutral prompt with all suggestions for a change
 */
export function generatePrompt(
  changeName: string,
  change: Change,
  suggestions: Suggestion[]
): string {
  const suggestionBlocks = suggestions
    .map((suggestion, index) => {
      const location = findSuggestionLocation(suggestion.originalText, change);

      const locationInfo = location
        ? `**File:** \`${location.absolutePath}\` (line ${location.lineNumber})\n`
        : '**File:** Not identified; search for the original text within the change directory above.\n';

      return `### Suggestion ${index + 1}
${locationInfo}
**Original text:**
> ${suggestion.originalText}

**Suggested change:**
${suggestion.suggestedChange}`;
    })
    .join('\n\n');

  return `I'm reviewing the change "${changeName}" and have the following suggestions:

**Change directory:** \`${change.path}\`

## Suggestions

${suggestionBlocks}

---

Please update the referenced files to incorporate these suggestions.`;
}
