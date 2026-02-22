import type { FastifyInstance } from 'fastify';
import { authPreHandler } from '../middleware/auth.middleware.js';
import {
  getSyncDashboardHandler,
  triggerSyncHandler,
} from '../controllers/sync.controller.js';

export async function syncRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authPreHandler);

  app.get('/dashboard', getSyncDashboardHandler);
  app.post('/trigger', triggerSyncHandler);
}
