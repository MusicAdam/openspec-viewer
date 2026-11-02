import assert from 'node:assert/strict';
import test from 'node:test';
import { withProject, suggestionStorageKey } from '../frontend/src/lib/projectContext';

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
