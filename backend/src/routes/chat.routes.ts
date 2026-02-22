import type { FastifyInstance } from 'fastify';
import { chat } from '../controllers/chat.controller.js';
import { authPreHandler } from '../middleware/auth.middleware.js';

export async function chatRoutes(app: FastifyInstance): Promise<void> {
  app.post('/', {
    preHandler: [authPreHandler],
    handler: chat,
  });
}
