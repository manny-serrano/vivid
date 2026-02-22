import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';
import {
  getOrCreateProfile,
  updateProfile,
  completeOnboarding,
  generateIdentityCard,
  type ProfileInput,
} from '../services/identity.service.js';

async function resolveUserId(request: FastifyRequest): Promise<string> {
  const firebaseUid = request.user!.uid;
  const user = await prisma.user.findUnique({ where: { firebaseUid } });
  if (!user) throw new Error('User not found');
  return user.id;
}

export async function getProfileHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const userId = await resolveUserId(request);
  const profile = await getOrCreateProfile(userId);
  await reply.send(profile);
}

export async function updateProfileHandler(
  request: FastifyRequest<{ Body: ProfileInput }>,
  reply: FastifyReply,
): Promise<void> {
  const userId = await resolveUserId(request);
  const profile = await updateProfile(userId, request.body);
  await reply.send(profile);
}

export async function completeOnboardingHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const userId = await resolveUserId(request);
  const profile = await completeOnboarding(userId);
  await reply.send(profile);
}

export async function getIdentityCardHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const userId = await resolveUserId(request);
  const card = await generateIdentityCard(userId);
  if (!card) {
    await reply.status(404).send({ error: 'Twin not found — generate your Financial Twin first' });
    return;
  }
  await reply.send(card);
}
