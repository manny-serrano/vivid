import type { FastifyInstance } from 'fastify';
import { getLinkToken, exchangeToken } from '../controllers/plaid.controller.js';
import { handlePlaidWebhook } from '../controllers/plaid-webhook.controller.js';
import { authPreHandler } from '../middleware/auth.middleware.js';

export async function plaidRoutes(app: FastifyInstance): Promise<void> {
  // Public webhook endpoint — Plaid sends POST requests here when transactions update
  app.post('/webhook', {
    schema: {
      body: {
        type: 'object',
        properties: {
          webhook_type: { type: 'string' },
          webhook_code: { type: 'string' },
          item_id: { type: 'string' },
        },
      },
    },
    handler: handlePlaidWebhook,
  });

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
