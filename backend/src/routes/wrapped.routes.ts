import type { FastifyInstance } from 'fastify';
import { authPreHandler } from '../middleware/auth.middleware.js';
import { getWrappedHandler } from '../controllers/wrapped.controller.js';

export async function wrappedRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authPreHandler);
  app.get('/', getWrappedHandler);
}
