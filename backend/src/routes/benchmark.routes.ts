import type { FastifyInstance } from 'fastify';
import { authPreHandler } from '../middleware/auth.middleware.js';
import { getBenchmarkHandler } from '../controllers/benchmark.controller.js';

export async function benchmarkRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authPreHandler);

  app.get('/', getBenchmarkHandler);
}
