import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';
import {
  registerPartner,
  getPartnerByUserId,
  getPartnerDashboard,
  regenerateApiKey,
  getTierLimits,
  type RegisterPartnerInput,
} from '../services/partner.service.js';

async function resolveUserId(request: FastifyRequest): Promise<string> {
  const firebaseUid = request.user!.uid;
  const user = await prisma.user.findUnique({ where: { firebaseUid } });
  if (!user) throw new Error('User not found');
  return user.id;
}

export async function registerPartnerHandler(
  request: FastifyRequest<{ Body: Omit<RegisterPartnerInput, 'userId'> }>,
  reply: FastifyReply,
): Promise<void> {
  const userId = await resolveUserId(request);
  const result = await registerPartner({ ...request.body, userId });
  await reply.status(201).send(result);
}

export async function getPartnerProfileHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const userId = await resolveUserId(request);
  const partner = await getPartnerByUserId(userId);
  if (!partner) {
    await reply.status(404).send({ error: 'Not a registered partner' });
    return;
  }
  await reply.send(partner);
}

export async function getDashboardHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const userId = await resolveUserId(request);
  const dashboard = await getPartnerDashboard(userId);
  await reply.send(dashboard);
}

export async function regenerateKeyHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const userId = await resolveUserId(request);
  const result = await regenerateApiKey(userId);
  await reply.send(result);
}

export async function getTiersHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  await reply.send(getTierLimits());
}
