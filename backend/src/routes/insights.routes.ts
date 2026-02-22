import type { FastifyInstance } from 'fastify';
import {
  getStressScenarios,
  runStressTestHandler,
  getAnomaliesHandler,
} from '../controllers/insights.controller.js';
import { authPreHandler } from '../middleware/auth.middleware.js';

export async function insightsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/stress/scenarios', { handler: getStressScenarios });

  app.register(async (authenticated) => {
    authenticated.addHook('preHandler', authPreHandler);
    authenticated.post('/stress', { handler: runStressTestHandler });
    authenticated.get('/anomalies', { handler: getAnomaliesHandler });
  });
}
