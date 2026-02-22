import type { FastifyInstance } from 'fastify';
import { authPreHandler } from '../middleware/auth.middleware.js';
import {
  detectBillsHandler,
  generateEmailHandler,
  refineEmailHandler,
} from '../controllers/negotiate.controller.js';

export async function negotiateRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authPreHandler);

  app.get('/bills', detectBillsHandler);
  app.post('/generate-email', generateEmailHandler);
  app.post('/refine-email', refineEmailHandler);
}
