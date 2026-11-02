import assert from 'node:assert/strict';
import test from 'node:test';
import { withProject, suggestionStorageKey } from '../frontend/src/lib/projectContext';
import { setWorkspaceRoot } from '../frontend/src/lib/api';

test('navigation, search, and file URLs retain the selected project', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { location: { origin: 'http://localhost:3000', search: '?project=first' } },
  });

  try {
    assert.equal(withProject('/changes/same-name'), '/changes/same-name?project=first');
    assert.equal(withProject('/api/search?q=hello'), '/api/search?q=hello&project=first');
    assert.equal(withProject('/api/changes/a/files/mockup.html'), '/api/changes/a/files/mockup.html?project=first');
    const firstKey = suggestionStorageKey('same-name');
    window.location.search = '?project=second';
    assert.notEqual(suggestionStorageKey('same-name'), firstKey);
    window.location.search = '';
    assert.equal(suggestionStorageKey('same-name'), 'openspec-suggestions-same-name');
  } finally {
    if (previous) Object.defineProperty(globalThis, 'window', previous);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});

test('workspace selection sends a JSON override and resetting omits the override', async (t) => {
  const requests: { input: unknown; init?: RequestInit }[] = [];
  t.mock.method(globalThis, 'fetch', async (input: unknown, init?: RequestInit) => {
    requests.push({ input, init });
    return new Response(JSON.stringify({ root: 'selected', defaultRoot: 'startup', projects: [], warnings: [], scannedAt: '2026-01-01' }));
  });
  await setWorkspaceRoot('workspace with spaces');
  await setWorkspaceRoot();
  assert.equal(requests[0].input, '/api/workspace');
  assert.equal(requests[0].init?.method, 'POST');
  assert.deepEqual(requests[0].init?.headers, { 'Content-Type': 'application/json' });
  assert.deepEqual(JSON.parse(String(requests[0].init?.body)), { root: 'workspace with spaces' });
  assert.deepEqual(JSON.parse(String(requests[1].init?.body)), {});
});

test('workspace selection exposes the server validation message', async (t) => {
  t.mock.method(globalThis, 'fetch', async () =>
    new Response(JSON.stringify({ error: 'Workspace root must be a directory' }), { status: 400 })
  );
  await assert.rejects(setWorkspaceRoot('missing'), /Workspace root must be a directory/);
});
