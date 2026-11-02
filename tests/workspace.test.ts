import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import test, { type TestContext } from 'node:test';
import { WebSocket } from 'ws';
import { discoverProjects, describeProject, type DiscoveryResult } from '../src/discovery/projects.js';
import { createServer, type Server } from '../src/server/index.js';

interface WorkspaceOverview extends DiscoveryResult {
  defaultRoot: string;
}

function selectWorkspace(base: string, root?: string) {
  return fetch(`${base}/api/workspace`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ root }),
  });
}

async function workspace(t: TestContext) {
  const root = await mkdtemp(join(dirname(fileURLToPath(import.meta.url)), '.workspace-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

async function project(root: string, name: string, marker = 'specs') {
  const path = join(root, name, 'openspec');
  await mkdir(path, { recursive: true });
  if (marker === 'config.yaml') {
    await writeFile(join(path, marker), 'schema: spec-driven\n');
  } else {
    await mkdir(join(path, marker));
  }
  return path;
}

test('discovers nested projects and config-only projects while excluding generated trees and links', async (t) => {
  const root = await workspace(t);
  const specs = await project(root, 'first');
  const config = await project(root, join('team', 'second'), 'config.yaml');
  await project(root, join('node_modules', 'ignored'));
  await project(root, join('dist', 'ignored'));
  await project(root, join('.git', 'ignored'));
  await project(root, join('first', 'openspec', 'nested'));
  await mkdir(join(root, 'empty', 'openspec'), { recursive: true });
  await symlink(join(root, 'team'), join(root, 'linked-team'), process.platform === 'win32' ? 'junction' : 'dir');

  const result = await discoverProjects(root);
  assert.deepEqual(result.projects.map((item) => item.path), [specs, config]);
  assert.equal(result.projects[1].relativePath, relative(root, config));
  assert.equal(result.warnings.length, 0);
  assert.equal((await discoverProjects(config)).projects[0].path, config);
});

test('discovery rejects missing roots and sees newly created projects on refresh', async (t) => {
  const root = await workspace(t);
  assert.deepEqual((await discoverProjects(root)).projects, []);
  await assert.rejects(discoverProjects(join(root, 'missing')), { code: 'ENOENT' });
  const added = await project(root, 'added', 'changes');
  assert.deepEqual((await discoverProjects(root)).projects.map((item) => item.path), [added]);
});

test('overview serves the SPA and isolates project APIs and files, including after refresh', async (t) => {
  let server: Server | undefined;
  t.after(() => server?.close());
  const root = await workspace(t);
  const first = await project(root, 'first');
  const second = await project(root, 'second', 'config.yaml');
  for (const [path, content] of [[first, 'First project'], [second, 'Second project']]) {
    await writeFile(join(path, 'project.md'), `# Context\n\n${content}\n`);
    const changePath = join(path, 'changes', 'same-name');
    await mkdir(changePath, { recursive: true });
    await writeFile(join(changePath, 'proposal.md'), content);
    await writeFile(join(changePath, 'preview.html'), `<h1>${content}</h1>`);
  }

  server = await createServer({ rootPath: root, port: 0 });
  const base = new URL(server.url).origin;
  assert.equal(new URL((await fetch(base)).url).pathname, '/overview.html');
  assert.match(await (await fetch(server.url)).text(), /<div id="app">/);

  const discovered: DiscoveryResult = await (await fetch(`${base}/api/projects`)).json();
  assert.equal(discovered.projects.length, 2);
  assert.equal((await fetch(`${base}/api/project`)).status, 400);
  assert.equal((await fetch(`${base}/api/project?project=unknown`)).status, 404);
  for (const item of discovered.projects) {
    const response = await fetch(`${base}/api/project?project=${item.id}`);
    const body = await response.json();
    assert.equal(body.project.path, join(item.path, 'project.md'));
    const preview = await fetch(`${base}/api/changes/same-name/files/preview.html?project=${item.id}`);
    assert.match(await preview.text(), new RegExp(item.name === 'First' ? 'First project' : 'Second project'));
  }
  const added = await project(root, 'added', 'config.yaml');
  const cached: DiscoveryResult = await (await fetch(`${base}/api/projects`)).json();
  assert.deepEqual(cached, discovered);
  assert.equal((await fetch(`${base}/api/project?project=${describeProject(added, root).id}`)).status, 404);
  const refreshed: DiscoveryResult = await (await fetch(`${base}/api/projects?refresh=true`)).json();
  assert.ok(refreshed.projects.some((item) => item.path === added));
  assert.equal((await fetch(`${base}/api/project?project=${describeProject(added, root).id}`)).status, 200);
});

test('empty overviews rescan automatically, while nonempty results survive until explicit refresh', async (t) => {
  let server: Server | undefined;
  t.after(() => server?.close());
  const root = await workspace(t);
  server = await createServer({ rootPath: root, port: 0 });
  const base = new URL(server.url).origin;
  const initial: DiscoveryResult = await (await fetch(`${base}/api/projects`)).json();
  assert.equal(initial.projects.length, 0);

  const first = await project(root, 'first');
  const populatedResponse = await fetch(`${base}/api/projects`);
  assert.equal(populatedResponse.headers.get('cache-control'), 'no-store');
  const populated: DiscoveryResult = await populatedResponse.json();
  assert.deepEqual(populated.projects.map((item) => item.path), [first]);
  assert.ok(Number.isFinite(Date.parse(populated.scannedAt)));

  const second = await project(root, 'second');
  await rm(join(root, 'first'), { recursive: true, force: true });
  const cached: DiscoveryResult = await (await fetch(`${base}/api/projects?refresh=false`)).json();
  assert.deepEqual(cached, populated, 'cached results retain removed entries and do not discover new projects');
  assert.equal((await fetch(`${base}/api/projects?refresh=invalid`)).status, 400);
  const refreshed: DiscoveryResult = await (await fetch(`${base}/api/projects?refresh=true`)).json();
  assert.deepEqual(refreshed.projects.map((item) => item.path), [second]);

  await rm(root, { recursive: true, force: true });
  assert.equal((await fetch(`${base}/api/projects?refresh=true`)).status, 500);
  const afterFailure: DiscoveryResult = await (await fetch(`${base}/api/projects`)).json();
  assert.deepEqual(afterFailure, refreshed, 'a failed refresh preserves the last successful cache');
});

test('explicit nonstandard directories open directly and remain listed in the overview', async (t) => {
  let server: Server | undefined;
  t.after(() => server?.close());
  const root = await workspace(t);
  const explicit = join(root, 'custom-spec-directory');
  await mkdir(explicit);
  server = await createServer({ rootPath: root, openspecPath: explicit, port: 0 });
  const url = new URL(server.url);
  assert.equal(url.pathname, '/dashboard');
  assert.equal(url.searchParams.get('project'), describeProject(explicit, root).id);
  assert.equal((await fetch(`${url.origin}/api/project`)).status, 200);
  const result: DiscoveryResult = await (await fetch(`${url.origin}/api/projects`)).json();
  assert.ok(result.projects.some((item) => item.path === explicit));
  const other = join(root, 'other');
  const otherProject = await project(other, 'repository');
  const selected: WorkspaceOverview = await (await selectWorkspace(url.origin, other)).json();
  assert.deepEqual(selected.projects.map((item) => item.path), [otherProject]);
  assert.equal(new URL((await fetch(url.origin)).url).pathname, '/overview.html');
  const reset: WorkspaceOverview = await (await selectWorkspace(url.origin)).json();
  assert.ok(reset.projects.some((item) => item.path === explicit));
  assert.equal(new URL((await fetch(url.origin)).url).pathname, '/dashboard');
});

test('workspace selection replaces discovery, preserves opened projects and resets to the startup root', async (t) => {
  let server: Server | undefined;
  t.after(() => server?.close());
  const root = await workspace(t);
  const startup = join(root, 'startup');
  const first = await project(startup, 'first');
  const unopened = await project(startup, 'unopened');
  const other = join(root, 'elsewhere', 'other');
  const second = await project(other, 'second');
  server = await createServer({ rootPath: startup, port: 0 });
  const base = new URL(server.url).origin;
  const initial: WorkspaceOverview = await (await fetch(`${base}/api/projects`)).json();
  assert.equal(initial.root, startup);
  assert.equal(initial.defaultRoot, startup);
  const firstUrl = `${base}/api/project?project=${describeProject(first, startup).id}`;
  assert.equal((await fetch(firstUrl)).status, 200);

  const selectedResponse = await selectWorkspace(base, relative(startup, other));
  assert.equal(selectedResponse.status, 200);
  const selected: WorkspaceOverview = await selectedResponse.json();
  assert.equal(selected.root, other);
  assert.equal(selected.defaultRoot, startup);
  assert.deepEqual(selected.projects.map((item) => item.path), [second]);
  assert.deepEqual(await (await fetch(`${base}/api/projects`)).json(), selected);
  assert.equal((await (await fetch(firstUrl)).json()).project.path, join(first, 'project.md'));
  assert.equal((await fetch(`${base}/api/project?project=${describeProject(unopened, startup).id}`)).status, 404);
  const nextRoot = join(startup, 'nested');
  const third = await project(nextRoot, 'third');
  const nested: WorkspaceOverview = await (await selectWorkspace(base, 'nested')).json();
  assert.equal(nested.root, nextRoot, 'relative selections resolve against startup, not the current selection');
  assert.deepEqual(nested.projects.map((item) => item.path), [third]);
  const reset: WorkspaceOverview = await (await selectWorkspace(base)).json();
  assert.equal(reset.root, startup);
  assert.ok(reset.projects.some((item) => item.path === first));
  assert.ok(reset.projects.some((item) => item.path === third), 'reset performs fresh discovery');
});

test('invalid workspace selections retain the active root and its successful cache', async (t) => {
  let server: Server | undefined;
  t.after(() => server?.close());
  const root = await workspace(t);
  await project(root, 'existing');
  const file = join(root, 'not-a-folder');
  await writeFile(file, 'fixture');
  const link = join(root, 'linked-root');
  await symlink(join(root, 'existing'), link, process.platform === 'win32' ? 'junction' : 'dir');
  server = await createServer({ rootPath: root, port: 0 });
  const base = new URL(server.url).origin;
  const initial = await (await fetch(`${base}/api/projects`)).json();
  for (const candidate of [join(root, 'missing'), file, link, '', '   ', '\0']) {
    const response = await selectWorkspace(base, candidate);
    assert.equal(response.status, 400, JSON.stringify(candidate));
    const problem = await response.json();
    assert.ok(problem.error);
    assert.deepEqual(await (await fetch(`${base}/api/projects`)).json(), initial);
  }
  const plainText = await fetch(`${base}/api/workspace`, {
    method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: '{}',
  });
  assert.equal(plainText.status, 415);
  const crossSite = await fetch(`${base}/api/workspace`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Sec-Fetch-Site': 'cross-site' },
    body: '{}',
  });
  assert.equal(crossSite.status, 403);
  assert.deepEqual(await (await fetch(`${base}/api/projects`)).json(), initial);
});

test('an empty selected root clears old cards and retains auto-discovery and manual refresh semantics', async (t) => {
  let server: Server | undefined;
  t.after(() => server?.close());
  const root = await workspace(t);
  const startup = join(root, 'startup');
  await project(startup, 'original');
  const empty = join(root, 'empty');
  await mkdir(empty);
  server = await createServer({ rootPath: startup, port: 0 });
  const base = new URL(server.url).origin;
  await fetch(`${base}/api/projects`);
  const selected: WorkspaceOverview = await (await selectWorkspace(base, empty)).json();
  assert.equal(selected.root, empty);
  assert.deepEqual(selected.projects, []);
  const added = await project(empty, 'added');
  const populated: WorkspaceOverview = await (await fetch(`${base}/api/projects`)).json();
  assert.deepEqual(populated.projects.map((item) => item.path), [added]);
  const later = await project(empty, 'later');
  assert.deepEqual(await (await fetch(`${base}/api/projects`)).json(), populated);
  const refreshed: WorkspaceOverview = await (await fetch(`${base}/api/projects?refresh=true`)).json();
  assert.equal(refreshed.root, empty);
  assert.deepEqual(refreshed.projects.map((item) => item.path), [added, later]);
});

test('restarting without an explicit root restores the working directory rather than the previous selection', async (t) => {
  let server: Server | undefined;
  t.after(() => server?.close());
  const root = await workspace(t);
  await project(root, 'temporary-selection');
  server = await createServer({ port: 0 });
  let base = new URL(server.url).origin;
  const initial: WorkspaceOverview = await (await fetch(`${base}/api/projects`)).json();
  assert.equal(initial.root, process.cwd());
  assert.equal(initial.defaultRoot, process.cwd());
  const changed: WorkspaceOverview = await (await selectWorkspace(base, root)).json();
  assert.equal(changed.root, root);
  await server.close();
  server = await createServer({ port: 0 });
  base = new URL(server.url).origin;
  const restarted: WorkspaceOverview = await (await fetch(`${base}/api/projects`)).json();
  assert.equal(restarted.root, process.cwd());
  assert.equal(restarted.defaultRoot, process.cwd());
});

test('live refreshes stay project-scoped after selecting another workspace', { timeout: 15000 }, async (t) => {
  let server: Server | undefined;
  t.after(() => server?.close());
  const root = await workspace(t);
  const first = await project(root, 'first');
  const second = await project(root, 'second');
  server = await createServer({ rootPath: root, port: 0 });
  const base = new URL(server.url).origin;
  await fetch(`${base}/api/projects`);
  const sockets = [first, second].map((path) =>
    new WebSocket(`${base.replace('http:', 'ws:')}/ws?project=${describeProject(path, root).id}`)
  );
  t.after(() => sockets.forEach((socket) => socket.terminate()));
  await Promise.all(sockets.map((socket) => once(socket, 'message')));
  const nextRoot = join(root, 'next-workspace');
  await project(nextRoot, 'third');
  assert.equal((await selectWorkspace(base, nextRoot)).status, 200);
  const messages: unknown[][] = [[], []];
  sockets.forEach((socket, index) => {
    socket.on('message', (message) => messages[index].push(JSON.parse(message.toString())));
  });
  // Retry writes until chokidar has completed its initial asynchronous subscription.
  for (let attempt = 0; attempt < 30 && messages[0].length === 0; attempt++) {
    await writeFile(join(first, 'project.md'), `# Context\n\nUpdate ${attempt}\n`);
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  assert.ok(messages[0].length > 0, 'changed project receives a live update');
  assert.deepEqual(messages[1], [], 'other project receives no refresh');
});
