import type { FastifyRequest, FastifyReply } from 'fastify';
import { getTwin } from '../services/twin.service.js';
import { publishTwinGeneration } from '../services/pubsub.service.js';
import { prisma } from '../config/database.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

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

export async function regenerateMyTwin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { firebaseUid: request.user!.uid },
  });

  if (!user.hasPlaidConnection || !user.encryptedPlaidToken) {
    throw new BadRequestError('No linked bank account. Connect via Plaid first.');
  }

  await publishTwinGeneration(user.id);
  await reply.status(202).send({ success: true, message: 'Twin regeneration started' });
}
