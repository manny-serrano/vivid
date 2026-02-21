import type { FastifyInstance } from 'fastify';
import {
  registerInstitutionHandler,
  getMe,
  viewApplicantHandler,
} from '../controllers/institution.controller.js';
import { institutionAuthPreHandler } from '../middleware/institutionAuth.js';

export async function institutionRoutes(app: FastifyInstance): Promise<void> {
  app.post('/register', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'type', 'email', 'firebaseToken'],
        properties: {
          name: { type: 'string' },
          type: { type: 'string', enum: ['CREDIT_UNION', 'COMMUNITY_BANK', 'OTHER'] },
          email: { type: 'string' },
          firebaseToken: { type: 'string' },
          logoUrl: { type: 'string' },
        },
      },
      response: { 201: { type: 'object' } },
    },
    handler: registerInstitutionHandler,
  });

  app.register(async (protectedRoutes) => {
    protectedRoutes.addHook('preHandler', institutionAuthPreHandler);
    protectedRoutes.get('/me', { handler: getMe });
    protectedRoutes.get('/applicant/:token', {
      schema: {
        params: { type: 'object', required: ['token'], properties: { token: { type: 'string' } } },
      },
      handler: viewApplicantHandler,
    });
  });
}
