import type { FastifyRequest, FastifyReply } from 'fastify';
import { getTwin } from '../services/twin.service.js';
import { prisma } from '../config/database.js';
import { NotFoundError } from '../utils/errors.js';

export async function getMyTwin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const userId = (await prisma.user.findUniqueOrThrow({
    where: { firebaseUid: request.user!.uid },
  })).id;
  const twin = await getTwin(userId);
  if (!twin) throw new NotFoundError('Twin not found');
  await reply.send(twin);
}
