import type { FastifyRequest, FastifyReply } from 'fastify';
import { getTwin } from '../services/twin.service.js';
import { publishTwinGeneration } from '../services/pubsub.service.js';
import { prisma } from '../config/database.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';
import { generateExplainabilityReport } from '../ai/pillarExplainer.js';
import type { MonthlyData } from '../ai/scoreCalculator.js';

export async function getMyTwin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const userId = (await prisma.user.findUniqueOrThrow({
    where: { firebaseUid: request.user!.uid },
  })).id;
  const twin = await getTwin(userId);
  if (!twin) throw new NotFoundError('Twin not found');
  await reply.send(twin);
}

export async function regenerateMyTwin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { firebaseUid: request.user!.uid },
  });

  if (!user.hasPlaidConnection || !user.encryptedPlaidToken) {
    throw new BadRequestError('No linked bank account. Connect via Plaid first.');
  }

  await publishTwinGeneration(user.id);
  await reply.status(202).send({ success: true, message: 'Twin regeneration started' });
}

export async function getSnapshots(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const userId = (await prisma.user.findUniqueOrThrow({
    where: { firebaseUid: request.user!.uid },
  })).id;

  const snapshots = await prisma.twinSnapshot.findMany({
    where: { userId },
    orderBy: { snapshotAt: 'asc' },
  });

  await reply.send(snapshots);
}

export async function getTransactionDrilldown(
  request: FastifyRequest<{ Params: { category: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const userId = (await prisma.user.findUniqueOrThrow({
    where: { firebaseUid: request.user!.uid },
  })).id;

  const twin = await prisma.twin.findUnique({ where: { userId } });
  if (!twin) throw new NotFoundError('Twin not found');

  const { category } = request.params;

  const transactions = await prisma.transaction.findMany({
    where: { twinId: twin.id, vividCategory: category },
    orderBy: { date: 'desc' },
    select: {
      id: true,
      amount: true,
      date: true,
      merchantName: true,
      vividCategory: true,
      isRecurring: true,
      isIncomeDeposit: true,
    },
  });

  const total = transactions.reduce((s, t) => s + Math.abs(t.amount), 0);
  const count = transactions.length;

  await reply.send({
    category,
    total: Math.round(total * 100) / 100,
    count,
    transactions,
  });
}

export async function getCategoryAggregates(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const userId = (await prisma.user.findUniqueOrThrow({
    where: { firebaseUid: request.user!.uid },
  })).id;

  const twin = await prisma.twin.findUnique({ where: { userId } });
  if (!twin) throw new NotFoundError('Twin not found');

  const transactions = await prisma.transaction.findMany({
    where: { twinId: twin.id },
    select: { amount: true, vividCategory: true, isIncomeDeposit: true },
  });

  const byCategory: Record<string, { total: number; count: number }> = {};
  for (const t of transactions) {
    if (t.isIncomeDeposit) continue;
    const cat = t.vividCategory || 'other';
    if (!byCategory[cat]) byCategory[cat] = { total: 0, count: 0 };
    byCategory[cat].total += Math.abs(t.amount);
    byCategory[cat].count += 1;
  }

  const result = Object.entries(byCategory)
    .map(([category, data]) => ({
      category,
      total: Math.round(data.total * 100) / 100,
      count: data.count,
    }))
    .sort((a, b) => b.total - a.total);

  await reply.send(result);
}

// ---------------------------------------------------------------------------
// Pillar Explainability
// ---------------------------------------------------------------------------

const ESSENTIAL_CATEGORIES_EXPLAIN = new Set([
  'rent', 'groceries', 'utilities', 'insurance', 'medical', 'transportation', 'debt_payment',
]);

function rebuildMonthlyDataForExplain(
  transactions: {
    amount: number;
    date: Date;
    merchantName: string | null;
    vividCategory: string;
    isRecurring: boolean;
    isIncomeDeposit: boolean;
  }[],
): MonthlyData[] {
  const byMonth = new Map<string, typeof transactions>();
  for (const tx of transactions) {
    const month = tx.date.toISOString().slice(0, 7);
    const bucket = byMonth.get(month);
    if (bucket) bucket.push(tx);
    else byMonth.set(month, [tx]);
  }

  const sortedMonths = [...byMonth.keys()].sort();
  let runningBalance = 0;

  return sortedMonths.map((month) => {
    const txs = byMonth.get(month)!;
    let totalDeposits = 0, totalSpending = 0, essentialSpending = 0;
    let discretionarySpending = 0, debtPayments = 0, savingsTransfers = 0;
    let overdraftCount = 0, hasPayrollDeposit = false;
    const incomeSourceNames = new Set<string>();
    const subscriptionMerchants = new Set<string>();

    for (const tx of txs) {
      if (tx.isIncomeDeposit) {
        totalDeposits += Math.abs(tx.amount);
        incomeSourceNames.add((tx.merchantName ?? 'unknown').toLowerCase());
        const name = (tx.merchantName ?? '').toLowerCase();
        if (name.includes('payroll') || name.includes('direct dep') || name.includes('salary')) {
          hasPayrollDeposit = true;
        }
      } else {
        const abs = Math.abs(tx.amount);
        totalSpending += abs;
        if (tx.vividCategory === 'debt_payment') debtPayments += abs;
        else if (tx.vividCategory === 'savings_transfer') savingsTransfers += abs;
        else if (tx.vividCategory === 'subscriptions') {
          subscriptionMerchants.add((tx.merchantName ?? 'unknown').toLowerCase());
        }
        if (ESSENTIAL_CATEGORIES_EXPLAIN.has(tx.vividCategory)) essentialSpending += abs;
        else discretionarySpending += abs;
      }
    }

    runningBalance += totalDeposits - totalSpending;
    if (runningBalance < 0) overdraftCount = 1;

    return {
      month,
      totalDeposits,
      totalSpending,
      essentialSpending,
      discretionarySpending,
      debtPayments,
      savingsTransfers,
      endBalance: runningBalance,
      incomeSourceCount: incomeSourceNames.size,
      overdraftCount,
      subscriptionCount: subscriptionMerchants.size,
      hasPayrollDeposit,
    };
  });
}

export async function getPillarExplanations(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const userId = (await prisma.user.findUniqueOrThrow({
    where: { firebaseUid: request.user!.uid },
  })).id;

  const twin = await prisma.twin.findUnique({
    where: { userId },
    include: { transactions: true },
  });
  if (!twin) throw new NotFoundError('Twin not found');

  const monthlyData = rebuildMonthlyDataForExplain(twin.transactions);
  const txData = twin.transactions.map((t) => ({
    amount: t.amount,
    date: t.date.toISOString(),
    merchantName: t.merchantName,
    vividCategory: t.vividCategory,
    isRecurring: t.isRecurring,
    isIncomeDeposit: t.isIncomeDeposit,
  }));

  const report = generateExplainabilityReport(monthlyData, txData, {
    incomeStabilityScore: twin.incomeStabilityScore,
    spendingDisciplineScore: twin.spendingDisciplineScore,
    debtTrajectoryScore: twin.debtTrajectoryScore,
    financialResilienceScore: twin.financialResilienceScore,
    growthMomentumScore: twin.growthMomentumScore,
  });

  await reply.send(report);
}
