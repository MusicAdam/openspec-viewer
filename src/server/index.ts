import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

import { parseOpenSpec, type OpenSpecData } from '../parser/index.js';
import { createFileWatcher, type FileChangeEvent } from '../watcher/file-watcher.js';
import { WebSocketManager } from './websocket/handler.js';
import { registerApiRoutes } from './routes/api.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface ServerOptions {
  openspecPath: string;
  port: number;
  host?: string;
}

export interface Server {
  url: string;
  close: () => Promise<void>;
}

/**
 * Create and start the OpenSpec Viewer server
 */
export async function createServer(options: ServerOptions): Promise<Server> {
  const { openspecPath, port, host = '127.0.0.1' } = options;

  // Initialize data
  let data: OpenSpecData | null = null;
  const wsManager = new WebSocketManager();

  // Parse initial data
  const result = await parseOpenSpec(openspecPath);
  if (result.data) {
    data = result.data;
    console.log(`Loaded OpenSpec: ${data.project.name}`);
    console.log(`  ${data.specs.length} specs, ${data.changes.active.length} active changes`);
  } else {
    console.error('Failed to parse OpenSpec directory:', result.errors);
  }

  if (result.warnings.length > 0) {
    console.warn('Warnings:', result.warnings);
  }

  // Create Fastify instance
  const fastify = Fastify({
    logger: false,
  });

  // Register WebSocket plugin
  await fastify.register(fastifyWebsocket);

  // WebSocket endpoint
  fastify.register(async (fastify) => {
    fastify.get('/ws', { websocket: true }, (socket, req) => {
      wsManager.addClient(socket);
    });
  });

  // Register API routes
  await registerApiRoutes(
    fastify,
    () => data,
    () => openspecPath
  );

  // Serve static frontend files
  const frontendPath = join(__dirname, '..', '..', 'dist-frontend');
  const devFrontendPath = join(__dirname, '..', '..', 'frontend', 'dist');

  // Check which frontend path exists
  let staticPath = frontendPath;
  if (existsSync(devFrontendPath)) {
    staticPath = devFrontendPath;
  } else if (!existsSync(frontendPath)) {
    console.warn('Frontend build not found. Run `npm run build:frontend` first.');
  }

  if (existsSync(staticPath)) {
    await fastify.register(fastifyStatic, {
      root: staticPath,
      prefix: '/',
    });

    // SPA fallback - serve index.html for all non-API routes
    fastify.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api/') || request.url.startsWith('/ws')) {
        return reply.status(404).send({ error: 'Not found' });
      }
      return reply.sendFile('index.html');
    });
  }

  // Set up file watcher
  const watcher = createFileWatcher(openspecPath, async (event: FileChangeEvent) => {
    console.log(`File ${event.type}: ${event.path}`);

    // Re-parse affected data
    const result = await parseOpenSpec(openspecPath);
    if (result.data) {
      data = result.data;
      // Broadcast update to all clients
      wsManager.broadcastFileChange(event, getRefreshData(event, data));
    }
  });

  // Start server
  await fastify.listen({ port, host });
  const url = `http://${host}:${port}`;

  console.log(`OpenSpec Viewer running at ${url}`);

  return {
    url,
    close: async () => {
      await watcher.close();
      await fastify.close();
    },
  };
}

/**
 * Get the data to send with a refresh event
 */
function getRefreshData(event: FileChangeEvent, data: OpenSpecData): unknown {
  switch (event.affectedEntity) {
    case 'project':
      return { project: data.project };
    case 'specs':
      return { specs: data.specs, stats: data.stats };
    case 'changes':
      return { changes: data.changes, stats: data.stats };
    default:
      return { stats: data.stats };
  }
}
