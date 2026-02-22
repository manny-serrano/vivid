import { prisma } from '../config/database.js';

const VALID_SCOPES = [
  'overall_score',
  'score_tier',
  'income_stability',
  'spending_discipline',
  'debt_trajectory',
  'financial_resilience',
  'growth_momentum',
  'blockchain_verified',
  'lending_readiness',
] as const;

export type BadgeScope = (typeof VALID_SCOPES)[number];

export function getValidScopes() {
  return [...VALID_SCOPES];
}

function tierFromScore(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 65) return 'Strong';
  if (score >= 50) return 'Moderate';
  if (score >= 35) return 'Developing';
  return 'Early Stage';
}

export async function createBadge(
  userId: string,
  scopes: string[],
  label?: string,
  expiresInDays?: number,
) {
  const validScopes = scopes.filter((s) => VALID_SCOPES.includes(s as BadgeScope));
  if (validScopes.length === 0) throw new Error('At least one valid scope is required');

  const badge = await prisma.verifiedBadge.create({
    data: {
      userId,
      allowedScopes: validScopes,
      label,
      expiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * 86400000) : undefined,
    },
  });

  return {
    id: badge.id,
    consentToken: badge.consentToken,
    scopes: badge.allowedScopes,
    label: badge.label,
    expiresAt: badge.expiresAt,
    verifyEndpoint: `/api/v1/verify/${badge.consentToken}`,
  };
}

export async function verifyBadge(consentToken: string) {
  const badge = await prisma.verifiedBadge.findUnique({ where: { consentToken } });
  if (!badge) return null;
  if (badge.revokedAt) return { valid: false, reason: 'Badge consent has been revoked' };
  if (badge.expiresAt && badge.expiresAt < new Date()) return { valid: false, reason: 'Badge consent has expired' };

  const twin = await prisma.twin.findUnique({ where: { userId: badge.userId } });
  if (!twin) return { valid: false, reason: 'No financial twin found' };

  await prisma.verifiedBadge.update({
    where: { id: badge.id },
    data: { accessCount: { increment: 1 }, lastAccessedAt: new Date() },
  });

  const scopes = new Set(badge.allowedScopes);
  const response: Record<string, unknown> = {
    valid: true,
    status: 'VIVID_VERIFIED',
    label: badge.label,
    issuedAt: badge.createdAt.toISOString(),
    expiresAt: badge.expiresAt?.toISOString() ?? null,
  };

  if (scopes.has('overall_score')) {
    response.overallScore = twin.overallScore;
  }
  if (scopes.has('score_tier')) {
    response.scoreTier = tierFromScore(twin.overallScore);
  }
  if (scopes.has('income_stability')) {
    response.incomeStabilityTier = tierFromScore(twin.incomeStabilityScore);
  }
  if (scopes.has('spending_discipline')) {
    response.spendingDisciplineTier = tierFromScore(twin.spendingDisciplineScore);
  }
  if (scopes.has('debt_trajectory')) {
    response.debtTrajectoryTier = tierFromScore(twin.debtTrajectoryScore);
  }
  if (scopes.has('financial_resilience')) {
    response.financialResilienceTier = tierFromScore(twin.financialResilienceScore);
  }
  if (scopes.has('growth_momentum')) {
    response.growthMomentumTier = tierFromScore(twin.growthMomentumScore);
  }
  if (scopes.has('blockchain_verified')) {
    response.blockchainVerified = twin.blockchainVerified;
    response.profileHash = twin.profileHash;
    response.hederaTransactionId = twin.hederaTransactionId;
  }
  if (scopes.has('lending_readiness')) {
    response.lendingReadiness = {
      personalLoan: tierFromScore(twin.personalLoanReadiness),
      autoLoan: tierFromScore(twin.autoLoanReadiness),
      mortgage: tierFromScore(twin.mortgageReadiness),
      smallBusiness: tierFromScore(twin.smallBizReadiness),
    };
  }

  return response;
}

export async function listUserBadges(userId: string) {
  return prisma.verifiedBadge.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      consentToken: true,
      label: true,
      allowedScopes: true,
      expiresAt: true,
      revokedAt: true,
      accessCount: true,
      lastAccessedAt: true,
      createdAt: true,
    },
  });
}

export async function revokeBadge(badgeId: string, userId: string) {
  return prisma.verifiedBadge.updateMany({
    where: { id: badgeId, userId },
    data: { revokedAt: new Date() },
  });
}
