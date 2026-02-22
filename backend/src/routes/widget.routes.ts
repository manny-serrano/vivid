import type { FastifyInstance } from 'fastify';
import { authPreHandler } from '../middleware/auth.middleware.js';
import {
  createWidgetHandler,
  listMyWidgetsHandler,
  getWidgetAnalyticsHandler,
  getWidgetConfigHandler,
  initiateSessionHandler,
  consentHandler,
  completeHandler,
  denyHandler,
  exchangeHandler,
  getScopesHandler,
} from '../controllers/widget.controller.js';

export async function widgetRoutes(app: FastifyInstance): Promise<void> {
  // --- Public info ---
  app.get('/scopes', { handler: getScopesHandler });
  app.get('/:widgetId/config', { handler: getWidgetConfigHandler });

  // --- Session flow (public — called from iframe) ---
  app.post('/:widgetId/session', { handler: initiateSessionHandler });

  // --- User consent (authenticated) ---
  app.post('/consent', { preHandler: [authPreHandler], handler: consentHandler });
  app.post('/complete', { preHandler: [authPreHandler], handler: completeHandler });
  app.post('/deny', { preHandler: [authPreHandler], handler: denyHandler });

  // --- Partner server-side (API key) ---
  app.post('/exchange', { handler: exchangeHandler });

  // --- Widget management (authenticated partner) ---
  app.post('/create', { preHandler: [authPreHandler], handler: createWidgetHandler });
  app.get('/mine', { preHandler: [authPreHandler], handler: listMyWidgetsHandler });
  app.get('/:widgetId/analytics', { preHandler: [authPreHandler], handler: getWidgetAnalyticsHandler });
}
