import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';
import { runStressTest, BUILT_IN_SCENARIOS, type StressTestInput } from '../ai/stressTest.js';
import { detectAnomalies, type TransactionForAnomaly } from '../ai/anomalyDetector.js';
import type { MonthlyData, VividScores } from '../ai/scoreCalculator.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';

// ---------------------------------------------------------------------------
// Helpers to reconstruct pipeline data from persisted twin + transactions
// ---------------------------------------------------------------------------

const ESSENTIAL_CATEGORIES = new Set([
  'rent', 'groceries', 'utilities', 'insurance', 'medical', 'transportation', 'debt_payment',
]);

function rebuildMonthlyData(
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
        if (ESSENTIAL_CATEGORIES.has(tx.vividCategory)) essentialSpending += abs;
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

function twinToScores(twin: {
  incomeStabilityScore: number;
  spendingDisciplineScore: number;
  debtTrajectoryScore: number;
  financialResilienceScore: number;
  growthMomentumScore: number;
  overallScore: number;
}): VividScores {
  return {
    incomeStability: twin.incomeStabilityScore,
    spendingDiscipline: twin.spendingDisciplineScore,
    debtTrajectory: twin.debtTrajectoryScore,
    financialResilience: twin.financialResilienceScore,
    growthMomentum: twin.growthMomentumScore,
    overall: twin.overallScore,
  };
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export async function getStressScenarios(
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  await reply.send(BUILT_IN_SCENARIOS);
}

export async function runStressTestHandler(
  request: FastifyRequest<{ Body: StressTestInput }>,
  reply: FastifyReply,
): Promise<void> {
  const input = request.body;
  if (!input?.scenarioId) throw new BadRequestError('scenarioId is required');

  const user = await prisma.user.findUniqueOrThrow({
    where: { firebaseUid: request.user!.uid },
  });

  const twin = await prisma.twin.findUnique({
    where: { userId: user.id },
    include: { transactions: true },
  });
  if (!twin) throw new NotFoundError('No Financial Twin found. Generate one first.');

  const monthlyData = rebuildMonthlyData(twin.transactions);
  const scores = twinToScores(twin);

  const result = await runStressTest(scores, monthlyData, input);
  await reply.send(result);
}

export async function getAnomaliesHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { firebaseUid: request.user!.uid },
  });

  const twin = await prisma.twin.findUnique({
    where: { userId: user.id },
    include: { transactions: true },
  });
  if (!twin) throw new NotFoundError('No Financial Twin found. Generate one first.');

  const monthlyData = rebuildMonthlyData(twin.transactions);
  const transactionsForAnomaly: TransactionForAnomaly[] = twin.transactions.map((t) => ({
    amount: t.amount,
    date: t.date.toISOString(),
    merchantName: t.merchantName,
    name: t.merchantName ?? 'Unknown',
    vividCategory: t.vividCategory,
    isRecurring: t.isRecurring,
    isIncomeDeposit: t.isIncomeDeposit,
  }));

  const report = await detectAnomalies(monthlyData, transactionsForAnomaly);
  await reply.send(report);
}
