import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';
import { analyzeSpending } from '../ai/subscriptionOptimizer.js';
import { analyzeLoanRisk } from '../ai/loanShield.js';
import { mean } from '../ai/scoreCalculator.js';
import type { MonthlyData } from '../ai/scoreCalculator.js';
import { NotFoundError } from '../utils/errors.js';

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

export async function optimizeSpendHandler(
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

  const txInput = twin.transactions.map((t) => ({
    amount: t.amount,
    date: t.date.toISOString(),
    merchantName: t.merchantName,
    name: t.merchantName ?? 'Unknown',
    vividCategory: t.vividCategory,
    isRecurring: t.isRecurring,
    isIncomeDeposit: t.isIncomeDeposit,
  }));

  const report = await analyzeSpending(txInput, `${user.firstName} ${user.lastName}`);
  await reply.send(report);
}

export async function loanShieldHandler(
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
  const txInput = twin.transactions.map((t) => ({
    amount: t.amount,
    date: t.date.toISOString(),
    merchantName: t.merchantName,
    name: t.merchantName ?? 'Unknown',
    vividCategory: t.vividCategory,
    isRecurring: t.isRecurring,
    isIncomeDeposit: t.isIncomeDeposit,
  }));

  const report = await analyzeLoanRisk(monthlyData, txInput, `${user.firstName} ${user.lastName}`, user.id);
  await reply.send(report);
}
