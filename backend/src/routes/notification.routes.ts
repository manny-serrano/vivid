import type { FastifyInstance } from 'fastify';
import { authPreHandler } from '../middleware/auth.middleware.js';
import {
  listNotificationsHandler,
  unreadCountHandler,
  markReadHandler,
  markAllReadHandler,
  dismissHandler,
  getPreferencesHandler,
  updatePreferencesHandler,
} from '../controllers/notification.controller.js';

export async function notificationRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authPreHandler);

  app.get('/', listNotificationsHandler);
  app.get('/unread-count', unreadCountHandler);
  app.post('/read-all', markAllReadHandler);
  app.post('/:notificationId/read', markReadHandler);
  app.post('/:notificationId/dismiss', dismissHandler);
  app.get('/preferences', getPreferencesHandler);
  app.patch('/preferences', updatePreferencesHandler);
}
