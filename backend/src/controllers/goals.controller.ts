import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';
import {
  createGoal,
  getUserGoals,
  getGoalById,
  updateGoal,
  deleteGoal,
  autoProgressGoals,
  getGoalStats,
  type CreateGoalInput,
  type UpdateGoalInput,
} from '../services/goals.service.js';

async function resolveUserId(request: FastifyRequest): Promise<string> {
  const firebaseUid = request.user!.uid;
  const user = await prisma.user.findUnique({ where: { firebaseUid } });
  if (!user) throw new Error('User not found');
  return user.id;
}

export async function createGoalHandler(
  request: FastifyRequest<{ Body: Omit<CreateGoalInput, 'userId'> }>,
  reply: FastifyReply,
): Promise<void> {
  const userId = await resolveUserId(request);
  const goal = await createGoal({ ...request.body, userId });
  await reply.status(201).send(goal);
}

export async function listGoalsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const userId = await resolveUserId(request);
  const goals = await getUserGoals(userId);
  await reply.send(goals);
}

export async function getGoalHandler(
  request: FastifyRequest<{ Params: { goalId: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const userId = await resolveUserId(request);
  const goal = await getGoalById(request.params.goalId, userId);
  if (!goal) {
    await reply.status(404).send({ error: 'Goal not found' });
    return;
  }
  await reply.send(goal);
}

export async function updateGoalHandler(
  request: FastifyRequest<{ Params: { goalId: string }; Body: UpdateGoalInput }>,
  reply: FastifyReply,
): Promise<void> {
  const userId = await resolveUserId(request);
  const goal = await updateGoal(request.params.goalId, userId, request.body);
  await reply.send(goal);
}

export async function deleteGoalHandler(
  request: FastifyRequest<{ Params: { goalId: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const userId = await resolveUserId(request);
  await deleteGoal(request.params.goalId, userId);
  await reply.send({ success: true });
}

export async function autoProgressHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const userId = await resolveUserId(request);
  const goals = await autoProgressGoals(userId);
  await reply.send(goals);
}

export async function statsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const userId = await resolveUserId(request);
  const stats = await getGoalStats(userId);
  await reply.send(stats);
}
