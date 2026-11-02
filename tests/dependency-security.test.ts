import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { request as httpRequest } from 'node:http';
import { fileURLToPath } from 'node:url';
import test, { type TestContext } from 'node:test';
import Fastify from 'fastify';
import deepmerge from 'deepmerge';
import staticAssets from '../src/server/static.js';

async function frontend(t: TestContext) {
  const app = Fastify();
  t.after(() => app.close());
  const workspace = await mkdtemp(join(dirname(fileURLToPath(import.meta.url)), '.static-'));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  const root = join(workspace, 'frontend');
  const outside = join(workspace, 'outside');
  await mkdir(root);
  await mkdir(outside);
  await writeFile(join(root, 'index.html'), '<!doctype html><title>Viewer</title>');
  await writeFile(join(root, 'app file.js'), 'console.log("viewer asset");');
  await writeFile(join(root, '.secret'), 'HIDDEN_CANARY');
  await writeFile(join(outside, 'private.txt'), 'OUTSIDE_CANARY');
  app.get('/api/example', async () => ({ example: true }));
  await app.register(staticAssets, { root, prefix: '/' });
  app.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith('/api/') || request.url.startsWith('/ws')) {
      return reply.code(404).send({ error: 'Not found' });
    }
    return reply.sendFile('index.html');
  });
  await app.ready();
  return { app, root, outside };
}

test('static assets preserve GET, HEAD, conditional requests, ranges and SPA/API routing', async (t) => {
  const { app } = await frontend(t);
  const asset = await app.inject('/app%20file.js');
  assert.equal(asset.statusCode, 200);
  assert.match(asset.headers['content-type'] || '', /javascript/);
  assert.equal(asset.body, 'console.log("viewer asset");');
  const head = await app.inject({ method: 'HEAD', url: '/app%20file.js' });
  assert.equal(head.statusCode, 200);
  assert.equal(head.body, '');
  assert.equal(head.headers['content-length'], asset.headers['content-length']);
  const conditional = await app.inject({ url: '/app%20file.js', headers: { 'if-none-match': String(asset.headers.etag) } });
  assert.equal(conditional.statusCode, 304);
  assert.equal(conditional.body, '');
  const partial = await app.inject({ url: '/app%20file.js', headers: { range: 'bytes=0-6' } });
  assert.equal(partial.statusCode, 206);
  assert.equal(partial.body, 'console');
  assert.match(String(partial.headers['content-range']), /^bytes 0-6\//);
  const invalidRange = await app.inject({ url: '/app%20file.js', headers: { range: 'bytes=9999-10000' } });
  assert.equal(invalidRange.statusCode, 416);
  assert.match(String(invalidRange.headers['content-range']), /^bytes \*\//);
  assert.match((await app.inject('/specs/authentication')).body, /<title>Viewer<\/title>/);
  const spaHead = await app.inject({ method: 'HEAD', url: '/specs/authentication' });
  assert.equal(spaHead.statusCode, 200);
  assert.equal(spaHead.body, '');
  assert.match((await app.inject('/')).body, /<title>Viewer<\/title>/);
  assert.equal((await app.inject({ method: 'POST', url: '/app%20file.js' })).statusCode, 405);
  assert.deepEqual((await app.inject('/api/example')).json(), { example: true });
  assert.equal((await app.inject('/api/missing')).statusCode, 404);
  assert.equal((await app.inject('/ws/missing')).statusCode, 404);
});

test('static paths reject traversal, alternate separators, dotfiles and outside-root links', async (t) => {
  const { app, root, outside } = await frontend(t);
  await symlink(outside, join(root, 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
  const address = new URL(await app.listen({ host: '127.0.0.1', port: 0 }));
  async function rawGet(path: string) {
    return new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
      const request = httpRequest({ hostname: address.hostname, port: address.port, path }, (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk: string) => { body += chunk; });
        response.on('error', reject);
        response.on('end', () => resolve({ statusCode: response.statusCode || 500, body }));
      });
      request.on('error', reject);
      request.setTimeout(5000, () => request.destroy(new Error('Static request timed out')));
      request.end();
    });
  }
  for (const url of [
    '/../outside/private.txt',
    '/%2e%2e/outside/private.txt',
    '/%2e%2e%2foutside%2fprivate.txt',
    '/%252e%252e%252foutside%252fprivate.txt',
    '/..%5coutside%5cprivate.txt',
    '//outside/private.txt',
    '/app%20file.js:secret',
    '/%00private.txt',
    '/%ZZ',
  ]) {
    const response = await rawGet(url);
    assert.ok(response.statusCode >= 400, `${url} should be rejected, got ${response.statusCode}`);
    assert.ok(!response.body.includes('OUTSIDE_CANARY'));
    assert.ok(!response.body.includes('<title>Viewer</title>'), 'rejected paths must not use the SPA fallback');
  }
  assert.equal((await app.inject('/.secret')).statusCode, 404);
  const linked = await app.inject('/linked/private.txt');
  assert.equal(linked.statusCode, 403);
  assert.ok(!linked.body.includes('OUTSIDE_CANARY'));
});

test('missing SPA index returns an explicit 404 without recursive fallback', async (t) => {
  const { app, root } = await frontend(t);
  await rm(join(root, 'index.html'));
  const response = await app.inject('/changes/not-a-static-file');
  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.json(), { error: 'Not found' });
});

test('deepmerge filters poisoned target/source keys before reading their values', () => {
  const poisoned = JSON.parse('{"__proto__":{"viewerPoisoned":true},"nested":{"__proto__":{"nestedPoisoned":true},"safe":1}}');
  for (const result of [deepmerge(poisoned, { safe: 2 }), deepmerge({}, poisoned)]) {
    assert.equal(Object.getPrototypeOf(result), Object.prototype);
    assert.equal(Object.hasOwn(result, '__proto__'), false);
    assert.equal('viewerPoisoned' in result, false);
    assert.equal(Object.getPrototypeOf(result.nested), Object.prototype);
    assert.equal('nestedPoisoned' in result.nested, false);
  }
  const getter = Object.defineProperty({}, '__proto__', {
    enumerable: true,
    get() { throw new Error('Unsafe key must not be read'); },
  });
  assert.deepEqual(deepmerge(getter, {}), {});
  assert.deepEqual(deepmerge({}, getter), {});
  assert.equal('viewerPoisoned' in {}, false);
});

test('deepmerge preserves Svelte configuration arrays, symbols, functions and special values', () => {
  const symbol = Symbol('configuration');
  const preprocess = () => 'preprocessed';
  const replacement = [preprocess];
  const date = new Date('2026-01-01');
  const expression = /viewer/;
  const merged = deepmerge(
    { preprocess: [() => 'old'], nested: { first: true }, [symbol]: { first: true } },
    { preprocess: replacement, nested: { second: true }, [symbol]: { second: true }, date, expression },
    { arrayMerge: (target, source) => source ?? target }
  );
  assert.equal(merged.preprocess, replacement);
  assert.equal(merged.preprocess[0], preprocess);
  assert.deepEqual(merged.nested, { first: true, second: true });
  assert.deepEqual(merged[symbol], { first: true, second: true });
  assert.equal(merged.date, date);
  assert.equal(merged.expression, expression);
  assert.deepEqual(deepmerge.all([{ nested: { first: true } }, { nested: { second: true } }]), {
    nested: { first: true, second: true },
  });
});
