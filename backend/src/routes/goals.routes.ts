import type { FastifyInstance } from 'fastify';
import { authPreHandler } from '../middleware/auth.middleware.js';
import {
  createGoalHandler,
  listGoalsHandler,
  getGoalHandler,
  updateGoalHandler,
  deleteGoalHandler,
  autoProgressHandler,
  statsHandler,
} from '../controllers/goals.controller.js';

export async function goalsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authPreHandler);

  app.post('/', createGoalHandler);
  app.get('/', listGoalsHandler);
  app.get('/stats', statsHandler);
  app.post('/auto-progress', autoProgressHandler);
  app.get('/:goalId', getGoalHandler);
  app.patch('/:goalId', updateGoalHandler);
  app.delete('/:goalId', deleteGoalHandler);
}
