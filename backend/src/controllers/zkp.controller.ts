import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';
import {
  createZkpClaim,
  verifyZkpClaim,
  listUserClaims,
  revokeZkpClaim,
  getSupportedClaimTypes,
} from '../services/zkp.service.js';
import { BadRequestError } from '../utils/errors.js';

interface CreateClaimBody {
  claimType: string;
  threshold: number;
  recipientLabel?: string;
  expiresInDays?: number;
}

export async function createClaim(
  request: FastifyRequest<{ Body: CreateClaimBody }>,
  reply: FastifyReply,
): Promise<void> {
  const { claimType, threshold, recipientLabel, expiresInDays } = request.body ?? {};
  if (!claimType || threshold == null) throw new BadRequestError('claimType and threshold are required');

  const user = await prisma.user.findUniqueOrThrow({
    where: { firebaseUid: request.user!.uid },
  });

  const result = await createZkpClaim(user.id, claimType, threshold, recipientLabel, expiresInDays);
  await reply.status(201).send(result);
}

export async function verifyClaim(
  request: FastifyRequest<{ Params: { proofHash: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { proofHash } = request.params;
  const result = await verifyZkpClaim(proofHash);

  if (!result) {
    await reply.status(404).send({ error: 'Proof not found' });
    return;
  }

  await reply.send(result);
}

export async function listClaims(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { firebaseUid: request.user!.uid },
  });
  const claims = await listUserClaims(user.id);
  await reply.send(claims);
}

export async function revokeClaim(
  request: FastifyRequest<{ Params: { claimId: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { firebaseUid: request.user!.uid },
  });
  await revokeZkpClaim(request.params.claimId, user.id);
  await reply.send({ revoked: true });
}

export async function getClaimTypes(
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  await reply.send(getSupportedClaimTypes());
}
