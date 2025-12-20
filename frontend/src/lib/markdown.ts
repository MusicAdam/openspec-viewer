import { marked } from 'marked';

// Configure marked for better rendering
marked.setOptions({
  gfm: true,
  breaks: true,
});

/**
 * Render markdown to HTML
 */
export function renderMarkdown(content: string): string {
  return marked(content) as string;
}

/**
 * Highlight delta operations in markdown content
 * Wraps ADDED/MODIFIED/REMOVED sections with appropriate CSS classes
 */
export function highlightDeltas(html: string): string {
  // Add classes to section headers
  return html
    .replace(
      /<h2>ADDED\s+Requirements?<\/h2>/gi,
      '<h2 class="diff-added px-2 py-1 rounded">ADDED Requirements</h2>'
    )
    .replace(
      /<h2>MODIFIED\s+Requirements?<\/h2>/gi,
      '<h2 class="diff-modified px-2 py-1 rounded">MODIFIED Requirements</h2>'
    )
    .replace(
      /<h2>REMOVED\s+Requirements?<\/h2>/gi,
      '<h2 class="diff-removed px-2 py-1 rounded">REMOVED Requirements</h2>'
    )
    .replace(
      /<h2>RENAMED\s+Requirements?<\/h2>/gi,
      '<h2 class="diff-modified px-2 py-1 rounded">RENAMED Requirements</h2>'
    );
}
