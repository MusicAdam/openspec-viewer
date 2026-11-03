import type { Suggestion } from '../stores/suggestions';
import type { Change } from './api';
import { findMarkdownTextLocation } from './markdown';

interface SuggestionLocation {
  filePath: string;
  lineNumber?: number;
}

/**
 * Find which file contains the original text and calculate line number
 */
function findSuggestionLocation(
  originalText: string,
  change: Change
): SuggestionLocation | null {
  const sources = new Map<string, { filePath: string; content: string }>();
  for (const group of change.fileGroups) {
    for (const file of group.files) {
      if (file.type === 'markdown' && file.content) {
        sources.set(file.absolutePath, { filePath: file.path, content: file.content });
      }
    }
  }

  for (const delta of change.specDeltas) {
    sources.set(delta.absolutePath, {
      filePath: `specs/${delta.capability}/spec.md`,
      content: delta.content,
    });
  }

  const locations: SuggestionLocation[] = [];
  for (const { filePath, content } of sources.values()) {
    const location = findMarkdownTextLocation(content, originalText);
    if (location) locations.push({ filePath, ...location });
  }
  return locations.length === 1 ? locations[0] : null;
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
        ? `**File:** \`${location.filePath}\`${location.lineNumber ? ` (line ${location.lineNumber})` : ''}\n`
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
