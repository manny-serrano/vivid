import type { FastifyInstance } from 'fastify';
import { getRedFlagsHandler } from '../controllers/redFlags.controller.js';
import { authPreHandler } from '../middleware/auth.middleware.js';

export async function redFlagsRoutes(app: FastifyInstance): Promise<void> {
  app.register(async (authenticated) => {
    authenticated.addHook('preHandler', authPreHandler);
    authenticated.get('/', { handler: getRedFlagsHandler });
  });
}
