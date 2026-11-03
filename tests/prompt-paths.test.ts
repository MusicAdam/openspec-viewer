import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test, { after } from 'node:test';
import { DOMParser } from 'linkedom';
import { parseChangeByName } from '../src/parser/changes.js';
import { generatePrompt } from '../frontend/src/lib/promptGenerator';
import type { Change } from '../frontend/src/lib/api';
import type { Suggestion } from '../frontend/src/stores/suggestions';
import { suggestionStore } from '../frontend/src/stores/suggestions';

const originalDOMParser = Object.getOwnPropertyDescriptor(globalThis, 'DOMParser');
Object.defineProperty(globalThis, 'DOMParser', { value: DOMParser, configurable: true });
after(() => {
  if (originalDOMParser) Object.defineProperty(globalThis, 'DOMParser', originalDOMParser);
  else Reflect.deleteProperty(globalThis, 'DOMParser');
});

const suggestion: Suggestion = {
  id: 'one',
  blockId: 'block-0',
  originalText: 'Original requirement',
  suggestedChange: 'Clarify the requirement.',
};

function changeAt(path: string, separator: string): Change {
  const file = {
    name: 'proposal',
    path: 'proposal.md',
    absolutePath: `${path}${separator}proposal.md`,
    type: 'markdown' as const,
    folder: 'root',
    content: '# Proposal\n\nOriginal requirement\n',
  };
  return {
    name: 'same-change',
    path,
    isArchived: false,
    archivedDate: null,
    proposal: file.content,
    tasks: [],
    tasksRaw: null,
    taskProgress: { done: 0, total: 0, percentage: 0 },
    design: null,
    specDeltas: [],
    files: [file],
    fileGroups: [{ name: 'Proposal', folder: '', files: [file], isCore: true }],
  };
}

test('absolute proposal paths distinguish identical changes on Windows and POSIX', () => {
  for (const [first, second, separator] of [
    ['D:\\first\\openspec\\changes\\same-change', 'D:\\second\\openspec\\changes\\same-change', '\\'],
    ['/workspace/first/openspec/changes/same-change', '/workspace/second/openspec/changes/same-change', '/'],
  ]) {
    const firstPrompt = generatePrompt('same-change', changeAt(first, separator), [suggestion]);
    const secondPrompt = generatePrompt('same-change', changeAt(second, separator), [suggestion]);
    assert.ok(firstPrompt.includes(`**Change directory:** \`${first}\``));
    assert.ok(firstPrompt.includes(`**File:** \`${first}${separator}proposal.md\` (line 3)`));
    assert.ok(secondPrompt.includes(`**File:** \`${second}${separator}proposal.md\` (line 3)`));
    assert.notEqual(firstPrompt, secondPrompt);
    assert.ok(firstPrompt.includes(suggestion.suggestedChange));
  }
});

test('parsed active and archived spec deltas retain their exact absolute source paths in prompts', async (t) => {
  const root = await mkdtemp(join(dirname(fileURLToPath(import.meta.url)), '.prompt-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const changeName of ['same-change', join('archive', '2026-01-01-same-change')]) {
    const changePath = join(root, 'changes', changeName);
    const specPath = join(changePath, 'specs', 'authentication', 'spec.md');
    await mkdir(dirname(specPath), { recursive: true });
    await writeFile(specPath, '# Requirements\n\nOriginal requirement\n');
    await writeFile(join(changePath, 'proposal.md'), '# Proposal\n\nOriginal proposal\n');
    const result = await parseChangeByName(relative(process.cwd(), root), changeName.split(/[\\/]/).at(-1)!);
    assert.ok(result.data);
    assert.equal(result.data.path, resolve(changePath));
    assert.equal(result.data.files[0].absolutePath, resolve(changePath, 'proposal.md'));
    assert.equal(result.data.specDeltas[0].absolutePath, resolve(specPath));
    const prompt = generatePrompt(result.data.name, result.data, [suggestion]);
    assert.ok(prompt.includes(`**File:** \`${resolve(specPath)}\` (line 3)`));
    const proposalPrompt = generatePrompt(result.data.name, result.data, [{ ...suggestion, originalText: 'Original proposal' }]);
    assert.ok(proposalPrompt.includes(`**File:** \`${resolve(changePath, 'proposal.md')}\` (line 3)`));
  }
});

test('unmatched suggestions keep project context and explicitly report the missing location', () => {
  const change = changeAt('D:\\project\\openspec\\changes\\same-change', '\\');
  const prompt = generatePrompt(change.name, change, [{ ...suggestion, originalText: 'Text not in any file' }]);
  assert.ok(prompt.includes(`**Change directory:** \`${change.path}\``));
  assert.match(prompt, /\*\*File:\*\* Not identified/);
  assert.ok(prompt.includes('Text not in any file'));
});

test('rendered Markdown suggestions locate arbitrary files and keep their original paragraph lines', () => {
  for (const newline of ['\n', '\r\n']) {
    const change = changeAt('D:\\project\\openspec\\changes\\same-change', '\\');
    const content = [
      '# Diagrams', '', '## Context', '',
      'Use `sample.md`, **safe** defaults and [local diagrams](https://example.test/diagrams).',
      'Keep A &amp; B, &#x3c;limits&#x3e;, &copy; and escaped \\*literal\\* markers.',
    ].join(newline);
    const file = {
      ...change.files[0],
      name: 'diagrams',
      path: 'diagrams.md',
      absolutePath: `${change.path}\\diagrams.md`,
      content,
    };
    change.files.push(file);
    change.fileGroups.push({ name: 'Other', folder: '', files: [file], isCore: false });
    const originalText = 'Use sample.md, safe defaults and local diagrams.Keep A & B, <limits>, \u00a9 and escaped *literal* markers.';
    const prompt = generatePrompt(change.name, change, [{ ...suggestion, originalText }]);
    assert.ok(prompt.includes(`**File:** \`${file.absolutePath}\` (line 5)`));
    assert.ok(prompt.includes(originalText));
    assert.ok(!prompt.includes('Not identified'));
  }
});

test('formatted spec deltas resolve and ambiguous files never select the first filename', () => {
  const change = changeAt('/workspace/openspec/changes/same-change', '/');
  const absolutePath = `${change.path}/specs/access/spec.md`;
  change.specDeltas = [{
    capability: 'access',
    absolutePath,
    content: '# Access\n\nUse **safe** defaults.\n',
    operations: [],
  }];
  const formatted = { ...suggestion, originalText: 'Use safe defaults.' };
  assert.ok(generatePrompt(change.name, change, [formatted]).includes(`**File:** \`${absolutePath}\` (line 3)`));
  change.files[0].content = 'Use safe defaults.';
  assert.match(generatePrompt(change.name, change, [formatted]), /\*\*File:\*\* Not identified/);
});

test('nested and repeated blocks identify a unique file without inventing a source line', () => {
  for (const content of ['- First item\n- **Nested** item\n', '**Nested** item\n\n**Nested** item\n']) {
    const change = changeAt('D:\\project\\openspec\\changes\\same-change', '\\');
    change.files[0].content = content;
    const prompt = generatePrompt(change.name, change, [{ ...suggestion, originalText: 'Nested item' }]);
    assert.ok(prompt.includes(`**File:** \`${change.files[0].absolutePath}\`\n`));
    assert.ok(!prompt.includes('(line'));
  }
  const change = changeAt('D:\\project\\openspec\\changes\\same-change', '\\');
  assert.match(generatePrompt(change.name, change, [{ ...suggestion, originalText: '' }]), /\*\*File:\*\* Not identified/);
});

test('formatted suggestions survive unrelated live updates and resolve only when their text changes', () => {
  suggestionStore.enterSuggestionMode('rendered-markdown');
  suggestionStore.addSuggestion('block-1', 'Use safe defaults.', 'Clarify defaults.');
  assert.equal(suggestionStore.reconcileSuggestions(['# New heading', 'Use **safe** defaults.', 'Other file.']), 0);
  assert.equal(suggestionStore.reconcileSuggestions(['# New heading', 'Use strict defaults.', 'Other file.']), 1);
  suggestionStore.exitSuggestionMode();
});
