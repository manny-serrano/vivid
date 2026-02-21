import type { FastifyInstance } from 'fastify';
import { getLinkToken, exchangeToken } from '../controllers/plaid.controller.js';
import { authPreHandler } from '../middleware/auth.middleware.js';

export async function plaidRoutes(app: FastifyInstance): Promise<void> {
  app.register(async (authenticated) => {
    authenticated.addHook('preHandler', authPreHandler);

    authenticated.get('/link-token', {
      schema: {
        response: { 200: { type: 'object', properties: { linkToken: { type: 'string' }, expiration: { type: 'string' } } } },
      },
      handler: getLinkToken,
    });

    authenticated.post('/exchange-token', {
      schema: {
        body: {
          type: 'object',
          required: ['publicToken'],
          properties: { publicToken: { type: 'string' } },
        },
        response: { 202: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' } } } },
      },
      handler: exchangeToken,
    });
  });
}
