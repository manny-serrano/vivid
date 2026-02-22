import type { FastifyInstance } from 'fastify';
import { createClaim, verifyClaim, listClaims, revokeClaim, getClaimTypes } from '../controllers/zkp.controller.js';
import { authPreHandler } from '../middleware/auth.middleware.js';

export async function zkpRoutes(app: FastifyInstance): Promise<void> {
  app.get('/types', { handler: getClaimTypes });

  // Public verification — no auth required
  app.get('/verify/:proofHash', { handler: verifyClaim });

  app.register(async (authenticated) => {
    authenticated.addHook('preHandler', authPreHandler);
    authenticated.post('/', { handler: createClaim });
    authenticated.get('/', { handler: listClaims });
    authenticated.post('/:claimId/revoke', { handler: revokeClaim });
  });
}
