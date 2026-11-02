import Fastify, { type FastifyRequest } from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { lstat, readdir } from 'fs/promises';

import { parseOpenSpec, type OpenSpecData } from '../parser/index.js';
import { describeProject, discoverProjects, type DiscoveryResult, type DiscoveredProject } from '../discovery/projects.js';
import { createFileWatcher } from '../watcher/file-watcher.js';
import { WebSocketManager } from './websocket/handler.js';
import { registerApiRoutes } from './routes/api.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface ServerOptions {
  openspecPath?: string;
  rootPath?: string;
  port: number;
  host?: string;
}

export interface Server {
  url: string;
  close: () => Promise<void>;
}

interface ProjectContext {
  path: string;
  data: OpenSpecData;
  wsManager: WebSocketManager;
  watcher: ReturnType<typeof createFileWatcher>;
}

export async function createServer(options: ServerOptions): Promise<Server> {
  const { port, host = '127.0.0.1' } = options;
  const defaultRoot = resolve(options.rootPath || process.cwd());
  let rootPath = defaultRoot;
  const defaultProject = options.openspecPath ? describeProject(options.openspecPath, rootPath) : null;
  const projects = new Map<string, DiscoveredProject>();
  const contexts = new Map<string, Promise<ProjectContext>>();
  const requestContexts = new WeakMap<FastifyRequest, ProjectContext>();
  let discovery: Promise<DiscoveryResult> | null = null;
  let cachedDiscovery: DiscoveryResult | null = null;
  let workspaceRevision = 0;
  let changingRoot = false;
  if (defaultProject) projects.set(defaultProject.id, defaultProject);

  function cacheDiscovery(result: DiscoveryResult) {
    if (defaultProject && result.root === defaultRoot &&
      !result.projects.some((project) => project.id === defaultProject.id)) {
      result.projects.push(defaultProject);
    }
    projects.clear();
    for (const project of result.projects) projects.set(project.id, project);
    cachedDiscovery = result;
  }

  async function scan(forceRefresh = false): Promise<DiscoveryResult> {
    if (!forceRefresh && cachedDiscovery?.projects.length) return cachedDiscovery;
    if (!discovery) {
      const revision = workspaceRevision;
      const pending: Promise<DiscoveryResult> = discoverProjects(rootPath).then((result) => {
        // A scan of the previous root must not replace the newly selected workspace.
        if (revision === workspaceRevision) cacheDiscovery(result);
        return result;
      }).finally(() => {
        if (discovery === pending) discovery = null;
      });
      discovery = pending;
    }
    return discovery;
  }

  async function loadProject(project: DiscoveredProject): Promise<ProjectContext> {
    const result = await parseOpenSpec(project.path);
    if (!result.data) throw new Error(`Failed to load ${project.path}: ${result.errors.join('; ')}`);
    if (result.errors.length || result.warnings.length) {
      console.warn(`OpenSpec ${project.path}:`, ...result.errors, ...result.warnings);
    }
    const wsManager = new WebSocketManager();
    const context: ProjectContext = {
      path: project.path,
      data: result.data,
      wsManager,
      watcher: createFileWatcher(project.path, async (event) => {
        try {
          const updated = await parseOpenSpec(project.path);
          if (updated.errors.length || updated.warnings.length) {
            console.warn(`OpenSpec ${project.path}:`, ...updated.errors, ...updated.warnings);
          }
          if (updated.data) {
            context.data = updated.data;
            wsManager.broadcastFileChange(event);
          } else {
            wsManager.broadcast({ type: 'error', message: 'Failed to refresh project; see server diagnostics' });
          }
        } catch (error) {
          console.error(`Failed to refresh ${project.path}:`, error);
          wsManager.broadcast({ type: 'error', message: 'Failed to refresh project' });
        }
      }),
    };
    context.watcher.on('error', (error) => {
      console.error(`File watcher failed for ${project.path}:`, error);
      wsManager.broadcast({ type: 'error', message: 'Project file watching failed' });
    });
    return context;
  }

  function getContext(request: FastifyRequest): ProjectContext {
    const context = requestContexts.get(request);
    if (!context) throw new Error('Project context not loaded');
    return context;
  }

  const fastify = Fastify({ logger: false });
  fastify.addHook('onClose', async () => {
    for (const pending of contexts.values()) {
      const context = await pending;
      context.wsManager.close();
      await context.watcher.close();
    }
  });
  await fastify.register(fastifyWebsocket);

  fastify.get<{ Querystring: { refresh?: boolean } }>('/api/projects', {
    schema: {
      querystring: {
        type: 'object',
        properties: { refresh: { type: 'boolean' } },
      },
    },
  }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    return { ...await scan(request.query.refresh === true), defaultRoot };
  });
  fastify.post<{ Body: { root?: string } }>('/api/workspace', {
    onRequest: async (request, reply) => {
      if (request.headers['sec-fetch-site'] === 'cross-site') {
        return reply.status(403).send({ error: 'Workspace changes must come from this viewer' });
      }
      if (request.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json') {
        return reply.status(415).send({ error: 'Workspace changes require application/json' });
      }
    },
    schema: {
      body: {
        type: 'object',
        properties: { root: { type: 'string', minLength: 1 } },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    if (changingRoot) return reply.status(409).send({ error: 'Another workspace change is in progress' });
    const root = request.body.root?.trim();
    if (root === '') return reply.status(400).send({ error: 'Enter a workspace folder path' });
    const nextRoot = resolve(defaultRoot, root ?? '.');
    changingRoot = true;
    try {
      let result: DiscoveryResult;
      try {
        const stats = await lstat(nextRoot);
        if (!stats.isDirectory() || stats.isSymbolicLink()) {
          return reply.status(400).send({ error: 'Workspace root must be a directory, not a file or link' });
        }
        await readdir(nextRoot);
        if (nextRoot === rootPath) return { ...await scan(), defaultRoot };
        result = await discoverProjects(nextRoot);
      } catch (error) {
        if (error instanceof Error && 'code' in error &&
          ['ENOENT', 'ENOTDIR', 'EACCES', 'EPERM', 'ENAMETOOLONG', 'EINVAL', 'ERR_INVALID_ARG_VALUE'].includes(String(error.code))) {
          return reply.status(400).send({ error: `Cannot use workspace folder: ${error.message}` });
        }
        throw error;
      }
      workspaceRevision++;
      discovery = null;
      rootPath = nextRoot;
      cacheDiscovery(result);
      return { ...result, defaultRoot };
    } finally {
      changingRoot = false;
    }
  });
  fastify.get('/', async (_request, reply) => {
    return reply.redirect(defaultProject && rootPath === defaultRoot
      ? `/dashboard?project=${encodeURIComponent(defaultProject.id)}`
      : '/overview.html');
  });

  fastify.register(async (scoped) => {
    scoped.addHook('preValidation', async (request, reply) => {
      const query = request.query as { project?: unknown };
      const id = query.project === undefined ? defaultProject?.id : query.project;
      if (typeof id !== 'string') {
        return reply.status(400).send({ error: 'Select a project from /overview.html' });
      }
      let pending = contexts.get(id);
      if (!pending) {
        if (!projects.has(id)) await scan();
        const project = projects.get(id);
        if (!project) return reply.status(404).send({ error: 'Project not found in this workspace' });
        pending = loadProject(project).catch((error) => {
          contexts.delete(id);
          throw error;
        });
        contexts.set(id, pending);
      }
      requestContexts.set(request, await pending);
    });

    scoped.get('/ws', { websocket: true }, (socket, request) => {
      getContext(request).wsManager.addClient(socket);
    });
    await registerApiRoutes(scoped, (request) => getContext(request).data, (request) => getContext(request).path);
  });

  const frontendPath = join(__dirname, '..', '..', 'dist-frontend');
  const devFrontendPath = join(__dirname, '..', '..', 'frontend', 'dist');
  const staticPath = existsSync(devFrontendPath) ? devFrontendPath : frontendPath;
  if (existsSync(staticPath)) {
    await fastify.register(fastifyStatic, { root: staticPath, prefix: '/', index: false });
    fastify.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api/') || request.url.startsWith('/ws')) {
        return reply.status(404).send({ error: 'Not found' });
      }
      return reply.sendFile('index.html');
    });
  } else {
    console.warn('Frontend build not found. Run `npm run build:frontend` first.');
  }

  try {
    await fastify.listen({ port, host });
  } catch (error) {
    await fastify.close();
    throw error;
  }
  const address = fastify.server.address();
  const actualPort = address && typeof address !== 'string' ? address.port : port;
  const baseUrl = `http://${host}:${actualPort}`;
  const url = defaultProject
    ? `${baseUrl}/dashboard?project=${encodeURIComponent(defaultProject.id)}`
    : `${baseUrl}/overview.html`;
  console.log(`OpenSpec Viewer running at ${url}`);
  return { url, close: () => fastify.close() };
}
