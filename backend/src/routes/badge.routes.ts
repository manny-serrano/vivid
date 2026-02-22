import type { FastifyInstance } from 'fastify';
import { createBadgeHandler, verifyBadgeHandler, listBadgesHandler, revokeBadgeHandler, getScopesHandler } from '../controllers/badge.controller.js';
import { authPreHandler } from '../middleware/auth.middleware.js';

export async function badgeRoutes(app: FastifyInstance): Promise<void> {
  app.get('/scopes', { handler: getScopesHandler });

  // Public verification — no auth required (third-party apps hit this)
  app.get('/:consentToken', { handler: verifyBadgeHandler });

  app.register(async (authenticated) => {
    authenticated.addHook('preHandler', authPreHandler);
    authenticated.post('/', { handler: createBadgeHandler });
    authenticated.get('/', { handler: listBadgesHandler });
    authenticated.post('/:badgeId/revoke', { handler: revokeBadgeHandler });
  });
}
