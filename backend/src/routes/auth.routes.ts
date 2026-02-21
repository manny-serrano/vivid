import type { FastifyInstance } from 'fastify';
import { register, me } from '../controllers/auth.controller.js';
import { authPreHandler } from '../middleware/auth.middleware.js';

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post('/register', {
    schema: {
      body: {
        type: 'object',
        required: ['firebaseToken', 'firstName', 'lastName'],
        properties: {
          firebaseToken: { type: 'string' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
        },
      },
      response: { 201: { type: 'object', properties: { user: { type: 'object' }, token: { type: 'string' } } } },
    },
    handler: register,
  });

  app.get('/me', {
    preHandler: [authPreHandler],
    schema: {
      response: { 200: { type: 'object', properties: { user: { type: 'object' } } } },
    },
    handler: me,
  });
}
