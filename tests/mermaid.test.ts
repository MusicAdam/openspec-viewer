import assert from 'node:assert/strict';
import test from 'node:test';
import { renderMarkdown } from '../frontend/src/lib/markdown';

test('Mermaid fences receive graphical-rendering markers while retaining escaped source', () => {
  const source = 'flowchart LR\n  A["<unsafe> & details"] --> B["Done"]';
  const html = renderMarkdown(`\`\`\`mermaid\n${source}\n\`\`\``);
  assert.match(html, /<pre data-mermaid="true"><code class="language-mermaid">/);
  assert.match(html, /&lt;unsafe&gt; &amp; details/);
  assert.ok(!html.includes('<unsafe>'));
});

test('Mermaid detection supports fence variants and multiple diagrams without marking ordinary code', () => {
  const html = renderMarkdown([
    '~~~Mermaid',
    'sequenceDiagram',
    '  Alice->>Bob: Hello',
    '~~~',
    '',
    '```mermaid title=Relationships',
    'erDiagram',
    '  ORDER ||--|{ LINE : contains',
    '```',
    '',
    '```text',
    'A --> B',
    '```',
    '',
    '```javascript',
    'const mermaid = "<code>";',
    '```',
    '',
    'Inline `mermaid` stays inline.',
  ].join('\n'));
  assert.equal((html.match(/data-mermaid="true"/g) || []).length, 2);
  assert.match(html, /<pre><code class="language-text">A --&gt; B/);
  assert.match(html, /<pre><code class="language-javascript">/);
  assert.match(html, /Inline <code>mermaid<\/code> stays inline/);
});
