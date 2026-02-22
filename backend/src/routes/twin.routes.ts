import type { FastifyInstance } from 'fastify';
import {
  getMyTwin,
  regenerateMyTwin,
  getSnapshots,
  getTransactionDrilldown,
  getCategoryAggregates,
  getPillarExplanations,
} from '../controllers/twin.controller.js';
import { authPreHandler } from '../middleware/auth.middleware.js';

export async function twinRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', {
    preHandler: [authPreHandler],
    handler: getMyTwin,
  });

  app.post('/regenerate', {
    preHandler: [authPreHandler],
    handler: regenerateMyTwin,
  });

  app.get('/snapshots', {
    preHandler: [authPreHandler],
    handler: getSnapshots,
  });

  app.get('/categories', {
    preHandler: [authPreHandler],
    handler: getCategoryAggregates,
  });

  app.get('/categories/:category', {
    preHandler: [authPreHandler],
    handler: getTransactionDrilldown,
  });

  app.get('/explain', {
    preHandler: [authPreHandler],
    handler: getPillarExplanations,
  });
}
