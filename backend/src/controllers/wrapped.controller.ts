import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';
import { generateWrapped } from '../services/wrapped.service.js';

export async function getWrappedHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const firebaseUid = request.user!.uid;
  const user = await prisma.user.findUnique({ where: { firebaseUid } });
  if (!user) return reply.status(404).send({ error: 'User not found' });

  const wrapped = await generateWrapped(user.id);
  await reply.send(wrapped);
}
