// ---------------------------------------------------------------------------
// Vivid – Attestation Service (Networked Reputation Graph)
// ---------------------------------------------------------------------------

import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '../config/database.js';
import { createHederaClient, TopicMessageSubmitTransaction, TopicId } from '../blockchain/hederaClient.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProviderRegistration {
  name: string;
  type: string;
  domain: string;
  contactEmail?: string;
  logoUrl?: string;
}

export interface AttestationSubmission {
  userEmail: string;
  attestationType: string;
  claim: string;
  details?: string;
  evidence?: string;
  startDate?: string;
  endDate?: string;
  strength?: number;
}

export interface ReputationScore {
  overall: number;
  attestationCount: number;
  providerCount: number;
  verifiedProviderCount: number;
  strongestCategory: string;
  breakdown: {
    category: string;
    count: number;
    avgStrength: number;
    verified: boolean;
  }[];
  trustMultiplier: number;
}

// ---------------------------------------------------------------------------
// Provider management
// ---------------------------------------------------------------------------

function hashApiKey(key: string): string {
  return createHash('sha256').update(key, 'utf8').digest('hex');
}

export async function registerProvider(reg: ProviderRegistration) {
  const apiKey = `vivid_att_${randomBytes(24).toString('hex')}`;
  const apiKeyHash = hashApiKey(apiKey);

  const provider = await prisma.attestationProvider.create({
    data: {
      name: reg.name,
      type: reg.type as never,
      domain: reg.domain,
      apiKeyHash,
      contactEmail: reg.contactEmail,
      logoUrl: reg.logoUrl,
    },
  });

  return {
    id: provider.id,
    name: provider.name,
    apiKey,
    domain: provider.domain,
    message: 'Store this API key securely — it cannot be retrieved again.',
  };
}

export async function verifyProviderApiKey(apiKey: string) {
  const hash = hashApiKey(apiKey);
  return prisma.attestationProvider.findUnique({ where: { apiKeyHash: hash } });
}

export async function listProviders() {
  return prisma.attestationProvider.findMany({
    select: {
      id: true,
      name: true,
      type: true,
      domain: true,
      verified: true,
      logoUrl: true,
      createdAt: true,
      _count: { select: { attestations: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getProviderById(id: string) {
  return prisma.attestationProvider.findUnique({
    where: { id },
    include: { _count: { select: { attestations: true } } },
  });
}

// ---------------------------------------------------------------------------
// Attestation submission (by enterprise partner via API key)
// ---------------------------------------------------------------------------

function buildAttestationHash(
  providerId: string,
  userId: string,
  claim: string,
  timestamp: string,
): string {
  const data = `${providerId}:${userId}:${claim}:${timestamp}`;
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

export async function submitAttestation(
  providerId: string,
  submission: AttestationSubmission,
) {
  const user = await prisma.user.findUnique({
    where: { email: submission.userEmail },
    include: { twin: true },
  });
  if (!user) throw new Error(`No user found with email ${submission.userEmail}`);
  if (!user.twin) throw new Error('User has no Financial Twin');

  const now = new Date();
  const attestationHash = buildAttestationHash(
    providerId,
    user.id,
    submission.claim,
    now.toISOString(),
  );

  let hederaTransactionId: string | undefined;
  let hederaTimestamp: Date | undefined;
  let hederaTopicId: string | undefined;

  if (env.HEDERA_TOPIC_ID && env.HEDERA_ACCOUNT_ID) {
    try {
      const client = createHederaClient();
      const topicId = TopicId.fromString(env.HEDERA_TOPIC_ID);

      const message = JSON.stringify({
        type: 'ATTESTATION',
        attestationHash,
        providerId,
        attestationType: submission.attestationType,
        claim: submission.claim,
        timestamp: now.toISOString(),
        version: '1.0',
      });

      const submitTx = new TopicMessageSubmitTransaction()
        .setTopicId(topicId)
        .setMessage(message);

      const txResponse = await submitTx.execute(client);
      await txResponse.getReceipt(client);

      hederaTransactionId = txResponse.transactionId.toString();
      hederaTimestamp = now;
      hederaTopicId = topicId.toString();
    } catch (err) {
      logger.warn('[attestation] Hedera stamp failed, proceeding without blockchain proof', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const attestation = await prisma.attestation.create({
    data: {
      userId: user.id,
      twinId: user.twin.id,
      providerId,
      attestationType: submission.attestationType as never,
      claim: submission.claim,
      details: submission.details,
      evidence: submission.evidence,
      startDate: submission.startDate ? new Date(submission.startDate) : undefined,
      endDate: submission.endDate ? new Date(submission.endDate) : undefined,
      strength: Math.min(100, Math.max(1, submission.strength ?? 50)),
      attestationHash,
      hederaTransactionId,
      hederaTimestamp,
      hederaTopicId,
    },
    include: {
      provider: { select: { name: true, type: true, verified: true } },
    },
  });

  return attestation;
}

// ---------------------------------------------------------------------------
// Query attestations for a user
// ---------------------------------------------------------------------------

export async function getUserAttestations(userId: string) {
  return prisma.attestation.findMany({
    where: { userId, revokedAt: null },
    include: {
      provider: {
        select: { id: true, name: true, type: true, domain: true, verified: true, logoUrl: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getPublicAttestations(twinId: string) {
  return prisma.attestation.findMany({
    where: {
      twinId,
      revokedAt: null,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    include: {
      provider: {
        select: { name: true, type: true, verified: true, logoUrl: true },
      },
    },
    orderBy: [{ provider: { verified: 'desc' } }, { strength: 'desc' }],
  });
}

// ---------------------------------------------------------------------------
// Verify a specific attestation by hash
// ---------------------------------------------------------------------------

export async function verifyAttestation(attestationHash: string) {
  const attestation = await prisma.attestation.findUnique({
    where: { attestationHash },
    include: {
      provider: { select: { name: true, type: true, verified: true, domain: true } },
    },
  });

  if (!attestation) return null;
  if (attestation.revokedAt) return { valid: false, reason: 'Attestation has been revoked' };
  if (attestation.expiresAt && attestation.expiresAt < new Date()) {
    return { valid: false, reason: 'Attestation has expired' };
  }

  await prisma.attestation.update({
    where: { id: attestation.id },
    data: {
      verificationCount: { increment: 1 },
      lastVerifiedAt: new Date(),
    },
  });

  return {
    valid: true,
    attestationType: attestation.attestationType,
    claim: attestation.claim,
    provider: attestation.provider,
    strength: attestation.strength,
    hederaTransactionId: attestation.hederaTransactionId,
    hederaTopicId: attestation.hederaTopicId,
    hederaTimestamp: attestation.hederaTimestamp,
    startDate: attestation.startDate,
    endDate: attestation.endDate,
    createdAt: attestation.createdAt,
  };
}

// ---------------------------------------------------------------------------
// Revoke attestation (by provider)
// ---------------------------------------------------------------------------

export async function revokeAttestation(
  attestationId: string,
  providerId: string,
  reason?: string,
) {
  return prisma.attestation.updateMany({
    where: { id: attestationId, providerId },
    data: { revokedAt: new Date(), revokedReason: reason },
  });
}

// ---------------------------------------------------------------------------
// Reputation score calculation
// ---------------------------------------------------------------------------

const TYPE_WEIGHTS: Record<string, number> = {
  VERIFIED_INCOME: 25,
  EMPLOYMENT_VERIFIED: 22,
  ON_TIME_RENT: 20,
  LOAN_REPAYMENT: 18,
  GIG_EARNINGS: 15,
  UTILITY_PAYMENT: 12,
  IDENTITY_VERIFIED: 10,
  REFERENCE: 8,
  CUSTOM: 5,
};

export async function calculateReputationScore(userId: string): Promise<ReputationScore> {
  const attestations = await prisma.attestation.findMany({
    where: {
      userId,
      revokedAt: null,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    include: {
      provider: { select: { id: true, verified: true, type: true } },
    },
  });

  if (attestations.length === 0) {
    return {
      overall: 0,
      attestationCount: 0,
      providerCount: 0,
      verifiedProviderCount: 0,
      strongestCategory: 'none',
      breakdown: [],
      trustMultiplier: 1.0,
    };
  }

  const providerIds = new Set(attestations.map((a) => a.provider.id));
  const verifiedProviderIds = new Set(
    attestations.filter((a) => a.provider.verified).map((a) => a.provider.id),
  );

  // Group by attestation type
  const byType = new Map<string, typeof attestations>();
  for (const a of attestations) {
    const key = a.attestationType;
    const bucket = byType.get(key) ?? [];
    bucket.push(a);
    byType.set(key, bucket);
  }

  let totalWeightedScore = 0;
  let totalWeight = 0;
  let maxCategoryScore = 0;
  let strongestCategory = 'none';

  const breakdown = [...byType.entries()].map(([category, items]) => {
    const avgStrength = items.reduce((s, a) => s + a.strength, 0) / items.length;
    const verified = items.some((a) => a.provider.verified);
    const weight = TYPE_WEIGHTS[category] ?? 5;
    const categoryScore = avgStrength * (verified ? 1.3 : 1.0);

    totalWeightedScore += categoryScore * weight;
    totalWeight += weight;

    if (categoryScore > maxCategoryScore) {
      maxCategoryScore = categoryScore;
      strongestCategory = category;
    }

    return { category, count: items.length, avgStrength: Math.round(avgStrength), verified };
  });

  // Network effect: more unique verified providers = higher trust multiplier
  const networkBonus = Math.min(verifiedProviderIds.size * 0.1, 0.5);
  const diversityBonus = Math.min(byType.size * 0.05, 0.25);
  const trustMultiplier = 1.0 + networkBonus + diversityBonus;

  const rawScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
  const overall = Math.min(100, Math.round(rawScore * trustMultiplier));

  return {
    overall,
    attestationCount: attestations.length,
    providerCount: providerIds.size,
    verifiedProviderCount: verifiedProviderIds.size,
    strongestCategory,
    breakdown: breakdown.sort((a, b) => b.avgStrength - a.avgStrength),
    trustMultiplier: Math.round(trustMultiplier * 100) / 100,
  };
}

// ---------------------------------------------------------------------------
// Graph data for visualization
// ---------------------------------------------------------------------------

export interface GraphNode {
  id: string;
  label: string;
  type: 'user' | 'provider';
  verified?: boolean;
  logoUrl?: string;
  providerType?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  attestationType: string;
  claim: string;
  strength: number;
  hederaVerified: boolean;
  createdAt: string;
}

export async function getReputationGraph(userId: string): Promise<{
  nodes: GraphNode[];
  edges: GraphEdge[];
}> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { nodes: [], edges: [] };

  const attestations = await prisma.attestation.findMany({
    where: { userId, revokedAt: null },
    include: {
      provider: { select: { id: true, name: true, type: true, verified: true, logoUrl: true } },
    },
  });

  const userNode: GraphNode = {
    id: userId,
    label: `${user.firstName} ${user.lastName}`,
    type: 'user',
  };

  const providerMap = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];

  for (const att of attestations) {
    if (!providerMap.has(att.provider.id)) {
      providerMap.set(att.provider.id, {
        id: att.provider.id,
        label: att.provider.name,
        type: 'provider',
        verified: att.provider.verified,
        logoUrl: att.provider.logoUrl ?? undefined,
        providerType: att.provider.type,
      });
    }

    edges.push({
      source: att.provider.id,
      target: userId,
      attestationType: att.attestationType,
      claim: att.claim,
      strength: att.strength,
      hederaVerified: !!att.hederaTransactionId,
      createdAt: att.createdAt.toISOString(),
    });
  }

  return {
    nodes: [userNode, ...providerMap.values()],
    edges,
  };
}
