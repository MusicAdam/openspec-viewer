import type { FastifyInstance } from 'fastify';
import type { OpenSpecData } from '../../parser/index.js';
import { parseSpec, parseChangeByName, searchOpenSpec } from '../../parser/index.js';

/**
 * Register API routes
 */
export async function registerApiRoutes(
  fastify: FastifyInstance,
  getData: () => OpenSpecData | null,
  getOpenSpecPath: () => string
) {
  // Get project info
  fastify.get('/api/project', async (request, reply) => {
    const data = getData();
    if (!data) {
      return reply.status(503).send({ error: 'Data not loaded' });
    }
    return { project: data.project };
  });

  // Get all specs
  fastify.get('/api/specs', async (request, reply) => {
    const data = getData();
    if (!data) {
      return reply.status(503).send({ error: 'Data not loaded' });
    }
    return {
      specs: data.specs.map((s) => ({
        name: s.name,
        path: s.path,
        hasDesign: s.designContent !== null,
      })),
    };
  });

  // Get single spec
  fastify.get<{ Params: { name: string } }>('/api/specs/:name', async (request, reply) => {
    const { name } = request.params;
    const result = await parseSpec(getOpenSpecPath(), name);

    if (!result.data) {
      return reply.status(404).send({ error: result.errors[0] || 'Spec not found' });
    }

    return { spec: result.data };
  });

  // Get all changes
  fastify.get('/api/changes', async (request, reply) => {
    const data = getData();
    if (!data) {
      return reply.status(503).send({ error: 'Data not loaded' });
    }
    return {
      active: data.changes.active.map(summarizeChange),
      archived: data.changes.archived.map(summarizeChange),
    };
  });

  // Get single change
  fastify.get<{ Params: { name: string } }>('/api/changes/:name', async (request, reply) => {
    const { name } = request.params;
    const result = await parseChangeByName(getOpenSpecPath(), name);

    if (!result.data) {
      return reply.status(404).send({ error: result.errors[0] || 'Change not found' });
    }

    return { change: result.data };
  });

  // Get stats
  fastify.get('/api/stats', async (request, reply) => {
    const data = getData();
    if (!data) {
      return reply.status(503).send({ error: 'Data not loaded' });
    }
    return { stats: data.stats };
  });

  // Search
  fastify.get<{ Querystring: { q: string } }>('/api/search', async (request, reply) => {
    const { q } = request.query;

    if (!q || q.length < 2) {
      return { results: [] };
    }

    const data = getData();
    if (!data) {
      return reply.status(503).send({ error: 'Data not loaded' });
    }

    const results = searchOpenSpec(data, q);
    return { results };
  });
}

/**
 * Create a summary of a change for list views
 */
function summarizeChange(change: OpenSpecData['changes']['active'][0]) {
  return {
    name: change.name,
    path: change.path,
    isArchived: change.isArchived,
    archivedDate: change.archivedDate,
    taskProgress: change.taskProgress,
    specDeltaCount: change.specDeltas.length,
    hasProposal: change.proposal !== null,
    hasDesign: change.design !== null,
  };
}
