import type { FastifyInstance } from 'fastify';
import { getMyTwin } from '../controllers/twin.controller.js';
import { authPreHandler } from '../middleware/auth.middleware.js';

export async function twinRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', {
    preHandler: [authPreHandler],
    handler: getMyTwin,
  });
}
