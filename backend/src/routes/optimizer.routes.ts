import type { FastifyInstance } from 'fastify';
import { optimizeSpendHandler, loanShieldHandler } from '../controllers/optimizer.controller.js';
import { authPreHandler } from '../middleware/auth.middleware.js';

export async function optimizerRoutes(app: FastifyInstance): Promise<void> {
  app.register(async (authenticated) => {
    authenticated.addHook('preHandler', authPreHandler);
    authenticated.get('/subscriptions', { handler: optimizeSpendHandler });
    authenticated.get('/loan-shield', { handler: loanShieldHandler });
  });
}
