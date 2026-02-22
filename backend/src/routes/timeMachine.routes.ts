import type { FastifyInstance } from 'fastify';
import { getPresets, simulateHandler } from '../controllers/timeMachine.controller.js';
import { authPreHandler } from '../middleware/auth.middleware.js';

export async function timeMachineRoutes(app: FastifyInstance): Promise<void> {
  app.get('/presets', { handler: getPresets });

  app.register(async (authenticated) => {
    authenticated.addHook('preHandler', authPreHandler);
    authenticated.post('/simulate', { handler: simulateHandler });
  });
}
