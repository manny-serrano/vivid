import type { FastifyInstance } from 'fastify';
import { authPreHandler } from '../middleware/auth.middleware.js';
import {
  getProfileHandler,
  updateProfileHandler,
  completeOnboardingHandler,
  getIdentityCardHandler,
} from '../controllers/identity.controller.js';

export async function identityRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authPreHandler);

  app.get('/profile', getProfileHandler);
  app.patch('/profile', updateProfileHandler);
  app.post('/complete-onboarding', completeOnboardingHandler);
  app.get('/card', getIdentityCardHandler);
}
