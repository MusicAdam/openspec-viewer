import { realpath, stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import send from '@fastify/send';
import fp from 'fastify-plugin';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';

interface StaticOptions {
  root: string;
  prefix?: '/';
  index?: false;
}

declare module 'fastify' {
  interface FastifyReply {
    sendFile(fileName: string): Promise<void>;
  }
}

function isMissing(error: unknown): boolean {
  return error instanceof Error && 'code' in error &&
    (error.code === 'ENOENT' || error.code === 'ENOTDIR');
}

const staticAssets: FastifyPluginAsync<StaticOptions> = async (fastify, options) => {
  const root = await realpath(options.root);

  async function serve(
    request: FastifyRequest,
    reply: FastifyReply,
    encodedPath: string,
    fallback: boolean
  ): Promise<void> {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      reply.code(405).header('Allow', 'GET, HEAD').send({ error: 'Method not allowed' });
      return;
    }
    let pathname: string;
    try {
      pathname = decodeURIComponent(encodedPath);
    } catch (error) {
      if (!(error instanceof URIError)) throw error;
      reply.code(400).send({ error: 'Invalid asset path' });
      return;
    }

    const segments = pathname.split('/');
    if (!pathname.startsWith('/') || /%(?:2f|5c)/i.test(encodedPath) ||
      /[\\:\u0000-\u001f]/.test(pathname) ||
      pathname.includes('//') || /%(?:2e|2f|5c)/i.test(pathname) ||
      segments.some((segment) => segment === '.' || segment === '..')) {
      reply.code(400).send({ error: 'Invalid asset path' });
      return;
    }
    if (pathname.startsWith('/api/') || pathname === '/api' || pathname.startsWith('/ws') ||
      segments.some((segment) => segment.startsWith('.'))) {
      reply.code(404).send({ error: 'Not found' });
      return;
    }

    try {
      const target = await realpath(resolve(root, pathname.slice(1)));
      const withinRoot = relative(root, target);
      if (isAbsolute(withinRoot) || withinRoot === '..' || withinRoot.startsWith(`..${sep}`)) {
        reply.code(403).send({ error: 'Asset path is outside the frontend root' });
        return;
      }
      if ((await stat(target)).isDirectory()) {
        if (fallback) await reply.callNotFound();
        else reply.code(404).send({ error: 'Not found' });
        return;
      }
    } catch (error) {
      if (!isMissing(error)) throw error;
      if (fallback) await reply.callNotFound();
      else reply.code(404).send({ error: 'Not found' });
      return;
    }

    const result = await send(request.raw, encodedPath, {
      root,
      index: false,
      dotfiles: 'ignore',
    });

    if (result.type === 'directory' || (result.type === 'error' && result.statusCode === 404)) {
      result.stream.destroy();
      if (fallback) await reply.callNotFound();
      else reply.code(404).send({ error: 'Not found' });
      return;
    }

    await reply.code(result.statusCode).headers(result.headers).send(result.stream);
  }

  fastify.decorateReply('sendFile', async function (fileName: string) {
    await serve(this.request, this, `/${encodeURIComponent(fileName)}`, false);
  });
  fastify.get('/*', async (request, reply) => {
    const pathname = (request.raw.url || '/').split('?')[0];
    await serve(request, reply, pathname, true);
  });
};

export default fp(staticAssets, { name: 'openspec-viewer-static-assets', fastify: '5.x' });
