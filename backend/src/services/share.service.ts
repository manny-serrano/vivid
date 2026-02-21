import { prisma } from '../config/database.js';
import type { ShareToken } from '@prisma/client';

/** Input shape for creating a new share token. */
export interface CreateShareTokenInput {
  recipientEmail?: string;
  recipientInstitution?: string;
  recipientName?: string;
  expiresAt?: Date;
  showOverallScore?: boolean;
  showDimensionScores?: boolean;
  showNarrative?: boolean;
  showTimeline?: boolean;
  showTransactions?: boolean;
  showLendingReadiness?: boolean;
  showBlockchainProof?: boolean;
}

/**
 * Creates a share token that grants scoped access to a user's twin.
 * The token is auto-generated as a UUID by Prisma.
 *
 * @param userId - Owner of the twin.
 * @param input  - Permissions and recipient metadata.
 */
export async function createShareToken(
  userId: string,
  input: CreateShareTokenInput,
): Promise<ShareToken> {
  const twin = await prisma.twin.findUnique({ where: { userId } });
  if (!twin) {
    throw new Error('User does not have a generated twin');
  }

  return prisma.shareToken.create({
    data: {
      userId,
      twinId: twin.id,
      recipientEmail: input.recipientEmail,
      recipientInstitution: input.recipientInstitution,
      recipientName: input.recipientName,
      expiresAt: input.expiresAt,
      showOverallScore: input.showOverallScore ?? true,
      showDimensionScores: input.showDimensionScores ?? true,
      showNarrative: input.showNarrative ?? true,
      showTimeline: input.showTimeline ?? false,
      showTransactions: input.showTransactions ?? false,
      showLendingReadiness: input.showLendingReadiness ?? true,
      showBlockchainProof: input.showBlockchainProof ?? true,
    },
  });
}

/**
 * Lists all share tokens created by a user, ordered by creation date descending.
 */
export async function getShareTokens(userId: string): Promise<ShareToken[]> {
  return prisma.shareToken.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Revokes a share token by setting its `revokedAt` timestamp.
 * Only the owning user may revoke their own tokens.
 */
export async function revokeShareToken(
  userId: string,
  tokenId: string,
): Promise<ShareToken> {
  const existing = await prisma.shareToken.findUnique({
    where: { id: tokenId },
  });

  if (!existing || existing.userId !== userId) {
    throw new Error('Share token not found or access denied');
  }

  return prisma.shareToken.update({
    where: { id: tokenId },
    data: { revokedAt: new Date() },
  });
}

/** Data returned when a share token is successfully accessed. */
export interface ShareAccessResult {
  shareToken: ShareToken;
  twinData: Record<string, unknown>;
}

/**
 * Validates a share token string, increments its access count,
 * and returns the permitted twin data based on the token's permission flags.
 */
export async function accessShareToken(
  token: string,
): Promise<ShareAccessResult> {
  const shareToken = await prisma.shareToken.findUnique({
    where: { token },
    include: { twin: { include: { transactions: true } } },
  });

  if (!shareToken) {
    throw new Error('Invalid share token');
  }

  if (shareToken.revokedAt) {
    throw new Error('Share token has been revoked');
  }

  if (shareToken.expiresAt && shareToken.expiresAt < new Date()) {
    throw new Error('Share token has expired');
  }

  await prisma.shareToken.update({
    where: { id: shareToken.id },
    data: {
      accessCount: { increment: 1 },
      lastAccessedAt: new Date(),
    },
  });

  const twin = shareToken.twin;
  const twinData: Record<string, unknown> = {};

  if (shareToken.showOverallScore) {
    twinData.overallScore = twin.overallScore;
  }

  if (shareToken.showDimensionScores) {
    twinData.scores = {
      incomeStability: twin.incomeStabilityScore,
      spendingDiscipline: twin.spendingDisciplineScore,
      debtTrajectory: twin.debtTrajectoryScore,
      financialResilience: twin.financialResilienceScore,
      growthMomentum: twin.growthMomentumScore,
      overall: twin.overallScore,
    };
  }

  if (shareToken.showNarrative) {
    twinData.consumerNarrative = twin.consumerNarrative;
    twinData.institutionNarrative = twin.institutionNarrative;
  }

  if (shareToken.showLendingReadiness) {
    twinData.lendingReadiness = {
      personalLoanReadiness: twin.personalLoanReadiness,
      autoLoanReadiness: twin.autoLoanReadiness,
      mortgageReadiness: twin.mortgageReadiness,
      smallBizReadiness: twin.smallBizReadiness,
    };
  }

  if (shareToken.showTimeline) {
    twinData.generatedAt = twin.generatedAt;
    twinData.analysisMonths = twin.analysisMonths;
  }

  if (shareToken.showTransactions) {
    twinData.transactions = twin.transactions;
  }

  if (shareToken.showBlockchainProof) {
    twinData.blockchainProof = {
      profileHash: twin.profileHash,
      hederaTopicId: twin.hederaTopicId,
      hederaTransactionId: twin.hederaTransactionId,
      hederaTimestamp: twin.hederaTimestamp,
      blockchainVerified: twin.blockchainVerified,
    };
  }

  return { shareToken, twinData };
}
