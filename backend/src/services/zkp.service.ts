import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '../config/database.js';
import { createHederaClient, TopicMessageSubmitTransaction, TopicId } from '../blockchain/hederaClient.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export interface ClaimDefinition {
  type: string;
  statement: string;
  field: string;
  operator: '>' | '>=' | '<' | '<=' | '==' | '!=';
  threshold: number;
}

const SUPPORTED_CLAIMS: Record<string, Omit<ClaimDefinition, 'threshold'>> = {
  income_above: {
    type: 'income_above',
    statement: 'Monthly income exceeds ${{threshold}}',
    field: 'incomeStabilityScore',
    operator: '>',
  },
  overall_above: {
    type: 'overall_above',
    statement: 'Overall Vivid Score exceeds {{threshold}}',
    field: 'overallScore',
    operator: '>',
  },
  spending_discipline_above: {
    type: 'spending_discipline_above',
    statement: 'Spending Discipline score exceeds {{threshold}}',
    field: 'spendingDisciplineScore',
    operator: '>',
  },
  debt_below: {
    type: 'debt_below',
    statement: 'Debt Trajectory score is above {{threshold}} (healthy)',
    field: 'debtTrajectoryScore',
    operator: '>',
  },
  resilience_above: {
    type: 'resilience_above',
    statement: 'Financial Resilience score exceeds {{threshold}}',
    field: 'financialResilienceScore',
    operator: '>',
  },
  growth_above: {
    type: 'growth_above',
    statement: 'Growth Momentum score exceeds {{threshold}}',
    field: 'growthMomentumScore',
    operator: '>',
  },
  monthly_income_above: {
    type: 'monthly_income_above',
    statement: 'Average monthly income exceeds ${{threshold}}',
    field: '_monthlyIncome',
    operator: '>',
  },
};

export function getSupportedClaimTypes() {
  return Object.entries(SUPPORTED_CLAIMS).map(([key, def]) => ({
    type: key,
    label: def.statement.replace('{{threshold}}', '___'),
    field: def.field,
  }));
}

function evaluateClaim(
  twin: { [key: string]: unknown },
  transactions: { amount: number; isIncomeDeposit: boolean; date: Date }[],
  field: string,
  operator: string,
  threshold: number,
): boolean {
  let value: number;

  if (field === '_monthlyIncome') {
    const incomeTransactions = transactions.filter((t) => t.isIncomeDeposit);
    const totalIncome = incomeTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const months = new Set(incomeTransactions.map((t) => {
      const d = new Date(t.date);
      return `${d.getFullYear()}-${d.getMonth()}`;
    }));
    value = months.size > 0 ? totalIncome / months.size : 0;
  } else {
    value = (twin[field] as number) ?? 0;
  }

  switch (operator) {
    case '>': return value > threshold;
    case '>=': return value >= threshold;
    case '<': return value < threshold;
    case '<=': return value <= threshold;
    case '==': return value === threshold;
    case '!=': return value !== threshold;
    default: return false;
  }
}

function buildProofHash(userId: string, claimType: string, threshold: number, nonce: string): string {
  const data = `${userId}:${claimType}:${threshold}:${nonce}`;
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

function buildClaimHash(claimStatement: string, result: boolean, timestamp: string): string {
  const data = `${claimStatement}:${result}:${timestamp}`;
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

export async function createZkpClaim(
  userId: string,
  claimType: string,
  threshold: number,
  recipientLabel?: string,
  expiresInDays?: number,
) {
  const claimDef = SUPPORTED_CLAIMS[claimType];
  if (!claimDef) throw new Error(`Unsupported claim type: ${claimType}`);

  const twin = await prisma.twin.findUnique({
    where: { userId },
    include: { transactions: true },
  });
  if (!twin) throw new Error('No twin found for user');

  const statement = claimDef.statement.replace('{{threshold}}', String(threshold));
  const result = evaluateClaim(
    twin as unknown as Record<string, unknown>,
    twin.transactions,
    claimDef.field,
    claimDef.operator,
    threshold,
  );

  const nonce = randomBytes(16).toString('hex');
  const now = new Date();
  const proofHash = buildProofHash(userId, claimType, threshold, nonce);
  const claimHash = buildClaimHash(statement, result, now.toISOString());

  let hederaTransactionId: string | undefined;
  let hederaTimestamp: Date | undefined;
  let hederaTopicId: string | undefined;

  if (env.HEDERA_TOPIC_ID && env.HEDERA_ACCOUNT_ID) {
    try {
      const client = createHederaClient();
      const topicId = TopicId.fromString(env.HEDERA_TOPIC_ID);

      const message = JSON.stringify({
        type: 'ZKP_CLAIM',
        claimHash,
        proofHash,
        result,
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
      logger.warn('[zkp] Hedera stamp failed, proceeding without blockchain proof', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const claim = await prisma.zkpClaim.create({
    data: {
      userId,
      twinId: twin.id,
      claimType,
      claimStatement: statement,
      claimResult: result,
      claimHash,
      proofHash,
      hederaTransactionId,
      hederaTimestamp,
      hederaTopicId,
      recipientLabel,
      expiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * 86400000) : undefined,
    },
  });

  return {
    id: claim.id,
    proofHash: claim.proofHash,
    statement: claim.claimStatement,
    verified: claim.claimResult,
    hederaTransactionId: claim.hederaTransactionId,
    hederaTopicId: claim.hederaTopicId,
    expiresAt: claim.expiresAt,
    verifyUrl: `/api/v1/zkp/verify/${claim.proofHash}`,
  };
}

export async function verifyZkpClaim(proofHash: string) {
  const claim = await prisma.zkpClaim.findUnique({ where: { proofHash } });
  if (!claim) return null;
  if (claim.revokedAt) return { valid: false, reason: 'Claim has been revoked' };
  if (claim.expiresAt && claim.expiresAt < new Date()) return { valid: false, reason: 'Claim has expired' };

  await prisma.zkpClaim.update({
    where: { id: claim.id },
    data: { accessCount: { increment: 1 } },
  });

  return {
    valid: true,
    statement: claim.claimStatement,
    verified: claim.claimResult,
    claimHash: claim.claimHash,
    hederaTransactionId: claim.hederaTransactionId,
    hederaTopicId: claim.hederaTopicId,
    hederaTimestamp: claim.hederaTimestamp,
    createdAt: claim.createdAt,
    expiresAt: claim.expiresAt,
  };
}

export async function listUserClaims(userId: string) {
  return prisma.zkpClaim.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      claimType: true,
      claimStatement: true,
      claimResult: true,
      proofHash: true,
      recipientLabel: true,
      hederaTransactionId: true,
      expiresAt: true,
      revokedAt: true,
      accessCount: true,
      createdAt: true,
    },
  });
}

export async function revokeZkpClaim(claimId: string, userId: string) {
  return prisma.zkpClaim.updateMany({
    where: { id: claimId, userId },
    data: { revokedAt: new Date() },
  });
}
