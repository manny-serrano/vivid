import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';
import { getBenchmark } from '../services/benchmark.service.js';

async function resolveUserId(request: FastifyRequest): Promise<string> {
  const firebaseUid = request.user!.uid;
  const user = await prisma.user.findUnique({ where: { firebaseUid } });
  if (!user) throw new Error('User not found');
  return user.id;
}

export async function getBenchmarkHandler(
  request: FastifyRequest<{ Querystring: { ageRange?: string; state?: string; incomeRange?: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const userId = await resolveUserId(request);
  const filters = request.query;
  const result = await getBenchmark(userId, {
    ageRange: filters.ageRange || undefined,
    state: filters.state || undefined,
    incomeRange: filters.incomeRange || undefined,
  });
  await reply.send(result);
}
