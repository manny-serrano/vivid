import type { FastifyInstance } from 'fastify';
import { authPreHandler } from '../middleware/auth.middleware.js';
import {
  registerPartnerHandler,
  getPartnerProfileHandler,
  getDashboardHandler,
  regenerateKeyHandler,
  getTiersHandler,
} from '../controllers/partner.controller.js';

export async function partnerRoutes(app: FastifyInstance): Promise<void> {
  app.get('/tiers', getTiersHandler);

  app.register(async (auth) => {
    auth.addHook('preHandler', authPreHandler);

    auth.post('/register', registerPartnerHandler);
    auth.get('/profile', getPartnerProfileHandler);
    auth.get('/dashboard', getDashboardHandler);
    auth.post('/regenerate-key', regenerateKeyHandler);
  });
}
