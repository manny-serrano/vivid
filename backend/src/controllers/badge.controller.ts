import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';
import {
  createBadge,
  verifyBadge,
  listUserBadges,
  revokeBadge,
  getValidScopes,
} from '../services/badge.service.js';
import { BadRequestError } from '../utils/errors.js';

interface CreateBadgeBody {
  scopes: string[];
  label?: string;
  expiresInDays?: number;
}

export async function createBadgeHandler(
  request: FastifyRequest<{ Body: CreateBadgeBody }>,
  reply: FastifyReply,
): Promise<void> {
  const { scopes, label, expiresInDays } = request.body ?? {};
  if (!scopes?.length) throw new BadRequestError('At least one scope is required');

  const user = await prisma.user.findUniqueOrThrow({
    where: { firebaseUid: request.user!.uid },
  });

  const result = await createBadge(user.id, scopes, label, expiresInDays);
  await reply.status(201).send(result);
}

export async function verifyBadgeHandler(
  request: FastifyRequest<{ Params: { consentToken: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const result = await verifyBadge(request.params.consentToken);

  if (!result) {
    await reply.status(404).send({ error: 'Badge not found' });
    return;
  }

  await reply.send(result);
}

export async function listBadgesHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { firebaseUid: request.user!.uid },
  });
  const badges = await listUserBadges(user.id);
  await reply.send(badges);
}

export async function revokeBadgeHandler(
  request: FastifyRequest<{ Params: { badgeId: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { firebaseUid: request.user!.uid },
  });
  await revokeBadge(request.params.badgeId, user.id);
  await reply.send({ revoked: true });
}

export async function getScopesHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  await reply.send(getValidScopes());
}
