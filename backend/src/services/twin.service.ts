import { prisma } from '../config/database.js';
import { runTwinPipeline, type TwinData } from '../ai/pipeline.js';
import type { PlaidTransaction } from '../ai/transactionCategorizer.js';
import { stampProfileOnHedera } from '../blockchain/stampProfile.js';
import { decrypt } from './encryption.service.js';
import { getTransactions } from './plaid.service.js';
import type { Twin } from '@prisma/client';

/**
 * Orchestrates the full twin-generation flow for a user:
 *
 * 1. Decrypt the stored Plaid access token.
 * 2. Fetch the last 12 months of transactions via Plaid.
 * 3. Run the AI pipeline (categorise → aggregate → score → narrate).
 * 4. Stamp the resulting profile on Hedera for immutability.
 * 5. Persist the twin, its transactions, and blockchain metadata in a single DB transaction.
 */
export async function generateTwin(userId: string): Promise<Twin> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
  });

  if (!user.encryptedPlaidToken) {
    throw new Error('User has no linked Plaid account');
  }

  const accessToken = await decrypt(user.encryptedPlaidToken);

  const now = new Date();
  const startDate = new Date(now);
  startDate.setMonth(startDate.getMonth() - 12);

  const raw = await getTransactions(
    accessToken,
    formatDate(startDate),
    formatDate(now),
  );
  const transactions: PlaidTransaction[] = raw.map((t) => ({
    transaction_id: t.transaction_id,
    account_id: t.account_id,
    amount: t.amount,
    date: t.date,
    name: t.name ?? '',
    merchant_name: t.merchant_name ?? null,
    category: t.category ?? null,
    personal_finance_category: t.personal_finance_category ?? null,
    payment_channel: (t as { payment_channel?: string }).payment_channel ?? 'other',
    pending: (t as { pending?: boolean }).pending ?? false,
  }));

  const twinData = await runTwinPipeline(userId, transactions);

  const profileForHash = {
    scores: twinData.scores,
    consumerNarrative: twinData.consumerNarrative,
    institutionNarrative: twinData.institutionNarrative,
    lendingReadiness: twinData.lendingReadiness,
  };

  const stamp = await stampProfileOnHedera(profileForHash, userId);

  const twin = await persistTwin(userId, twinData, stamp);

  return twin;
}

/**
 * Retrieves the twin for a user, including related transactions.
 */
export async function getTwin(userId: string): Promise<Twin | null> {
  return prisma.twin.findUnique({
    where: { userId },
    include: { transactions: true },
  });
}

/**
 * Retrieves twin data through a share token, respecting the token's
 * permission flags and validity constraints.
 */
export async function getTwinByShareToken(
  token: string,
): Promise<Partial<TwinData> | null> {
  const shareToken = await prisma.shareToken.findUnique({
    where: { token },
    include: { twin: { include: { transactions: true } } },
  });

  if (!shareToken) return null;

  if (shareToken.revokedAt) return null;
  if (shareToken.expiresAt && shareToken.expiresAt < new Date()) return null;

  const twin = shareToken.twin;
  const result: Record<string, unknown> = {
    userId: twin.userId,
    generatedAt: twin.generatedAt.toISOString(),
  };

  if (shareToken.showOverallScore) {
    result.overallScore = twin.overallScore;
  }

  if (shareToken.showDimensionScores) {
    result.scores = {
      incomeStability: twin.incomeStabilityScore,
      spendingDiscipline: twin.spendingDisciplineScore,
      debtTrajectory: twin.debtTrajectoryScore,
      financialResilience: twin.financialResilienceScore,
      growthMomentum: twin.growthMomentumScore,
      overall: twin.overallScore,
    };
  }

  if (shareToken.showNarrative) {
    result.consumerNarrative = twin.consumerNarrative;
    result.institutionNarrative = twin.institutionNarrative;
  }

  if (shareToken.showLendingReadiness) {
    result.lendingReadiness = {
      personalLoanReadiness: twin.personalLoanReadiness,
      autoLoanReadiness: twin.autoLoanReadiness,
      mortgageReadiness: twin.mortgageReadiness,
      smallBizReadiness: twin.smallBizReadiness,
    };
  }

  if (shareToken.showTransactions) {
    result.transactions = twin.transactions;
  }

  if (shareToken.showBlockchainProof) {
    result.blockchainProof = {
      profileHash: twin.profileHash,
      hederaTopicId: twin.hederaTopicId,
      hederaTransactionId: twin.hederaTransactionId,
      hederaTimestamp: twin.hederaTimestamp,
      blockchainVerified: twin.blockchainVerified,
    };
  }

  return result as Partial<TwinData>;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface StampData {
  hederaTransactionId: string;
  hederaTimestamp: string;
  profileHash: string;
  topicId: string;
}

async function persistTwin(
  userId: string,
  data: TwinData,
  stamp: StampData,
): Promise<Twin> {
  return prisma.$transaction(async (tx) => {
    const existingTwin = await tx.twin.findUnique({ where: { userId } });
    if (existingTwin) {
      await tx.transaction.deleteMany({ where: { twinId: existingTwin.id } });
      await tx.twin.delete({ where: { userId } });
    }

    // Save a historical snapshot before replacing the twin
    if (existingTwin) {
      await tx.twinSnapshot.create({
        data: {
          userId,
          incomeStabilityScore: existingTwin.incomeStabilityScore,
          spendingDisciplineScore: existingTwin.spendingDisciplineScore,
          debtTrajectoryScore: existingTwin.debtTrajectoryScore,
          financialResilienceScore: existingTwin.financialResilienceScore,
          growthMomentumScore: existingTwin.growthMomentumScore,
          overallScore: existingTwin.overallScore,
          snapshotAt: existingTwin.generatedAt,
        },
      });
    }

    const twin = await tx.twin.create({
      data: {
        userId,
        incomeStabilityScore: data.scores.incomeStability,
        spendingDisciplineScore: data.scores.spendingDiscipline,
        debtTrajectoryScore: data.scores.debtTrajectory,
        financialResilienceScore: data.scores.financialResilience,
        growthMomentumScore: data.scores.growthMomentum,
        overallScore: data.scores.overall,
        consumerNarrative: data.consumerNarrative,
        institutionNarrative: data.institutionNarrative,
        personalLoanReadiness: data.lendingReadiness.personalLoanReadiness.score ?? 0,
        autoLoanReadiness: data.lendingReadiness.autoLoanReadiness.score ?? 0,
        mortgageReadiness: data.lendingReadiness.mortgageReadiness.score ?? 0,
        smallBizReadiness: data.lendingReadiness.smallBizReadiness.score ?? 0,
        profileHash: stamp.profileHash,
        hederaTopicId: stamp.topicId,
        hederaTransactionId: stamp.hederaTransactionId,
        hederaTimestamp: new Date(stamp.hederaTimestamp),
        blockchainVerified: true,
        transactionCount: data.enrichedTransactions.length,
        analysisMonths: data.monthlyData.length,
        transactions: {
          create: data.enrichedTransactions.map((etx) => ({
            userId,
            plaidTransactionId: etx.transactionId,
            amount: etx.amount,
            date: new Date(etx.date),
            merchantName: etx.merchantName,
            originalCategory: [],
            vividCategory: etx.vividCategory,
            isBusinessExpense: false,
            isRecurring: etx.isRecurring,
            isIncomeDeposit: etx.isIncomeDeposit,
            confidenceScore: etx.confidenceScore,
          })),
        },
      },
    });

    return twin;
  });
}

function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
