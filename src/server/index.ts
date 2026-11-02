import Fastify, { type FastifyRequest } from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

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
  const rootPath = resolve(options.rootPath || process.cwd());
  const defaultProject = options.openspecPath ? describeProject(options.openspecPath, rootPath) : null;
  const projects = new Map<string, DiscoveredProject>();
  const contexts = new Map<string, Promise<ProjectContext>>();
  const requestContexts = new WeakMap<FastifyRequest, ProjectContext>();
  let discovery: Promise<DiscoveryResult> | null = null;
  let cachedDiscovery: DiscoveryResult | null = null;
  if (defaultProject) projects.set(defaultProject.id, defaultProject);

  async function scan(forceRefresh = false): Promise<DiscoveryResult> {
    if (!forceRefresh && cachedDiscovery?.projects.length) return cachedDiscovery;
    if (!discovery) {
      discovery = discoverProjects(rootPath).then((result) => {
        projects.clear();
        for (const project of result.projects) projects.set(project.id, project);
        if (defaultProject) projects.set(defaultProject.id, defaultProject);
        if (defaultProject && !result.projects.some((project) => project.id === defaultProject.id)) {
          result.projects.push(defaultProject);
        }
        cachedDiscovery = result;
        return result;
      }).finally(() => { discovery = null; });
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
    return scan(request.query.refresh === true);
  });
  fastify.get('/', async (_request, reply) => {
    return reply.redirect(defaultProject
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
      if (!projects.has(id)) await scan();
      const project = projects.get(id);
      if (!project) return reply.status(404).send({ error: 'Project not found in this workspace' });
      let pending = contexts.get(id);
      if (!pending) {
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
