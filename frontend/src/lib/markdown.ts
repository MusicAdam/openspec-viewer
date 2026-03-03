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
 * Block elements that can be selected for suggestions
 */
const SELECTABLE_BLOCK_TAGS = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'pre'];

/**
 * Render markdown with selectable blocks wrapped in divs with unique IDs
 * Used when suggestion mode is enabled
 */
export function renderMarkdownWithBlocks(content: string): string {
  const html = renderMarkdown(content);

  // Parse HTML and wrap block elements
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  let blockCounter = 0;

  function wrapBlocks(element: Element) {
    // Process children first (depth-first)
    const children = Array.from(element.children);
    for (const child of children) {
      wrapBlocks(child);
    }

    // Check if this element should be wrapped
    const tagName = element.tagName.toLowerCase();
    if (SELECTABLE_BLOCK_TAGS.includes(tagName)) {
      // Create wrapper div
      const wrapper = doc.createElement('div');
      wrapper.className = 'suggestion-block';
      wrapper.setAttribute('data-block-id', `block-${blockCounter++}`);

      // Store the text content for later use
      const textContent = element.textContent?.trim() || '';
      wrapper.setAttribute('data-block-text', textContent);

      // Replace element with wrapper containing element
      element.parentNode?.insertBefore(wrapper, element);
      wrapper.appendChild(element);
    }
  }

  wrapBlocks(doc.body);

  return doc.body.innerHTML;
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
