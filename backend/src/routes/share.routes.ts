import type { FastifyInstance } from 'fastify';
import {
  createShare,
  listShares,
  revokeShare,
  accessByToken,
} from '../controllers/share.controller.js';
import { authPreHandler } from '../middleware/auth.middleware.js';

export async function shareRoutes(app: FastifyInstance): Promise<void> {
  app.register(async (authenticated) => {
    authenticated.addHook('preHandler', authPreHandler);

    authenticated.post('/', {
      schema: {
        body: {
          type: 'object',
          properties: {
            recipientEmail: { type: 'string' },
            recipientInstitution: { type: 'string' },
            recipientName: { type: 'string' },
            showOverallScore: { type: 'boolean' },
            showDimensionScores: { type: 'boolean' },
            showNarrative: { type: 'boolean' },
            showTimeline: { type: 'boolean' },
            showTransactions: { type: 'boolean' },
            showLendingReadiness: { type: 'boolean' },
            showBlockchainProof: { type: 'boolean' },
            expiresInDays: { type: 'number' },
          },
        },
        response: { 201: { type: 'object' } },
      },
      handler: createShare,
    });

    authenticated.get('/', {
      handler: listShares,
    });

    authenticated.post('/:tokenId/revoke', {
      schema: {
        params: { type: 'object', required: ['tokenId'], properties: { tokenId: { type: 'string' } } },
        response: { 200: { type: 'object', properties: { revoked: { type: 'boolean' }, id: { type: 'string' } } } },
      },
      handler: revokeShare,
    });
  });

  app.get('/access/:token', {
    schema: {
      params: { type: 'object', required: ['token'], properties: { token: { type: 'string' } } },
    },
    handler: accessByToken,
  });
}
