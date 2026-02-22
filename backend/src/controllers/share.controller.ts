import type { FastifyRequest, FastifyReply } from 'fastify';
import { createShareToken, getShareTokens, revokeShareToken, accessShareToken } from '../services/share.service.js';
import { createShareTokenSchema } from '@vivid/shared';
import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

interface CreateShareBody {
  recipientEmail?: string;
  recipientInstitution?: string;
  recipientName?: string;
  showOverallScore?: boolean;
  showDimensionScores?: boolean;
  showNarrative?: boolean;
  showTimeline?: boolean;
  showTransactions?: boolean;
  showLendingReadiness?: boolean;
  showBlockchainProof?: boolean;
  expiresInDays?: number;
}

export async function createShare(
  request: FastifyRequest<{ Body: CreateShareBody }>,
  reply: FastifyReply,
): Promise<void> {
  const parsed = createShareTokenSchema.safeParse(request.body);
  if (!parsed.success) throw new BadRequestError(parsed.error.message);

  const userId = (await prisma.user.findUniqueOrThrow({
    where: { firebaseUid: request.user!.uid },
  })).id;

  const expiresAt = parsed.data.expiresInDays
    ? new Date(Date.now() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000)
    : undefined;

  const token = await createShareToken(userId, {
    ...parsed.data,
    expiresAt,
  });
  const shareUrl = `${env.FRONTEND_URL}/share/${token.token}`;
  await reply.status(201).send({
    id: token.id,
    token: token.token,
    shareUrl,
    recipientEmail: token.recipientEmail,
    recipientInstitution: token.recipientInstitution,
    recipientName: token.recipientName,
    permissions: {
      showOverallScore: token.showOverallScore,
      showDimensionScores: token.showDimensionScores,
      showNarrative: token.showNarrative,
      showTimeline: token.showTimeline,
      showTransactions: token.showTransactions,
      showLendingReadiness: token.showLendingReadiness,
      showBlockchainProof: token.showBlockchainProof,
    },
    expiresAt: token.expiresAt?.toISOString() ?? null,
    createdAt: token.createdAt.toISOString(),
  });
}

export async function listShares(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const userId = (await prisma.user.findUniqueOrThrow({
    where: { firebaseUid: request.user!.uid },
  })).id;
  const tokens = await getShareTokens(userId);
  await reply.send(
    tokens.map((t) => ({
      id: t.id,
      token: t.token,
      recipientName: t.recipientName,
      recipientInstitution: t.recipientInstitution,
      accessCount: t.accessCount,
      lastAccessedAt: t.lastAccessedAt?.toISOString() ?? null,
      expiresAt: t.expiresAt?.toISOString() ?? null,
      revokedAt: t.revokedAt?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(),
    })),
  );
}

interface RevokeParams {
  tokenId: string;
}

export async function revokeShare(
  request: FastifyRequest<{ Params: RevokeParams }>,
  reply: FastifyReply,
): Promise<void> {
  const userId = (await prisma.user.findUniqueOrThrow({
    where: { firebaseUid: request.user!.uid },
  })).id;
  const updated = await revokeShareToken(userId, request.params.tokenId);
  await reply.send({ revoked: true, id: updated.id });
}

interface AccessParams {
  token: string;
}

export async function accessByToken(
  request: FastifyRequest<{ Params: AccessParams }>,
  reply: FastifyReply,
): Promise<void> {
  const data = await accessShareToken(request.params.token);
  if (!data) throw new NotFoundError('Share link invalid or expired');
  await reply.send(data.twinData);
}
