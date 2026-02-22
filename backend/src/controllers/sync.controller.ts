import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';
import { getSyncDashboard, triggerManualSync } from '../services/sync.service.js';

async function resolveUserId(request: FastifyRequest): Promise<string> {
  const firebaseUid = request.user!.uid;
  const user = await prisma.user.findUnique({ where: { firebaseUid } });
  if (!user) throw new Error('User not found');
  return user.id;
}

export async function getSyncDashboardHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const userId = await resolveUserId(request);
  const dashboard = await getSyncDashboard(userId);
  await reply.send(dashboard);
}

export async function triggerSyncHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const userId = await resolveUserId(request);
  const result = await triggerManualSync(userId);
  await reply.send(result);
}
