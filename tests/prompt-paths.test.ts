import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { parseChangeByName } from '../src/parser/changes.js';
import { generatePrompt } from '../frontend/src/lib/promptGenerator';
import type { Change } from '../frontend/src/lib/api';
import type { Suggestion } from '../frontend/src/stores/suggestions';

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
