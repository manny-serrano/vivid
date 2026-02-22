import type { FastifyInstance } from 'fastify';
import { authPreHandler } from '../middleware/auth.middleware.js';
import {
  registerProviderHandler,
  listProvidersHandler,
  submitAttestationHandler,
  getMyAttestationsHandler,
  getReputationHandler,
  getGraphHandler,
  verifyAttestationHandler,
  revokeAttestationHandler,
  requestAttestationHandler,
} from '../controllers/attestation.controller.js';

export async function attestationRoutes(app: FastifyInstance): Promise<void> {
  // --- Provider endpoints ---
  app.post('/providers/register', { handler: registerProviderHandler });
  app.get('/providers', { handler: listProvidersHandler });

  // --- Enterprise partner endpoints (API-key auth) ---
  app.post('/submit', { handler: submitAttestationHandler });
  app.post('/revoke', { handler: revokeAttestationHandler });

  // --- User endpoints (Firebase auth) ---
  app.get('/me', { preHandler: [authPreHandler], handler: getMyAttestationsHandler });
  app.get('/reputation', { preHandler: [authPreHandler], handler: getReputationHandler });
  app.get('/graph', { preHandler: [authPreHandler], handler: getGraphHandler });
  app.post('/request', { preHandler: [authPreHandler], handler: requestAttestationHandler });

  // --- Public verification ---
  app.get('/verify/:attestationHash', { handler: verifyAttestationHandler });
}
