import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';
import { generateChatResponse, type FullChatContext, type TransactionSummary } from '../ai/chatbot.js';
import { generateRedFlagsReport } from '../ai/redFlags.js';
import { mean } from '../ai/scoreCalculator.js';
import type { MonthlyData } from '../ai/scoreCalculator.js';
import { BadRequestError } from '../utils/errors.js';

interface ChatBody {
  message: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
}

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

function buildTransactionSummary(
  rawTxs: {
    amount: number;
    date: Date;
    merchantName: string | null;
    vividCategory: string;
    isRecurring: boolean;
    isIncomeDeposit: boolean;
  }[],
  monthlyData: MonthlyData[],
): TransactionSummary {
  const avgIncome = mean(monthlyData.map((m) => m.totalDeposits));
  const avgSpending = mean(monthlyData.map((m) => m.totalSpending));
  const avgSavings = Math.round(avgIncome - avgSpending);
  const avgDebt = mean(monthlyData.map((m) => m.debtPayments));
  const dtiRatio = avgIncome > 0 ? avgDebt / avgIncome : 0;
  const latestBalance = monthlyData.length > 0 ? monthlyData[monthlyData.length - 1].endBalance : 0;
  const emergencyRunway = avgSpending > 0 ? Math.max(0, Math.floor(Math.max(latestBalance, 0) / avgSpending)) : 0;
  const totalOverdrafts = monthlyData.reduce((s, m) => s + m.overdraftCount, 0);
  const hasPayroll = monthlyData.some((m) => m.hasPayrollDeposit);
  const avgSources = mean(monthlyData.map((m) => m.incomeSourceCount));
  const avgSubs = mean(monthlyData.map((m) => m.subscriptionCount));

  // Top spending categories
  const catMap = new Map<string, { total: number; count: number }>();
  for (const tx of rawTxs) {
    if (tx.isIncomeDeposit) continue;
    const cat = tx.vividCategory || 'other';
    const existing = catMap.get(cat) ?? { total: 0, count: 0 };
    existing.total += Math.abs(tx.amount);
    existing.count++;
    catMap.set(cat, existing);
  }
  const topCategories = [...catMap.entries()]
    .map(([category, data]) => ({ category, total: Math.round(data.total), count: data.count }))
    .sort((a, b) => b.total - a.total);

  // Recurring charges
  const recurringMap = new Map<string, number[]>();
  for (const tx of rawTxs) {
    if (!tx.isRecurring || tx.isIncomeDeposit) continue;
    const key = (tx.merchantName ?? 'Unknown').toLowerCase().trim();
    const arr = recurringMap.get(key) ?? [];
    arr.push(Math.abs(tx.amount));
    recurringMap.set(key, arr);
  }
  const recurringCharges = [...recurringMap.entries()]
    .map(([name, amounts]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      amount: mean(amounts),
    }))
    .sort((a, b) => b.amount - a.amount);

  // Recent large expenses
  const expenses = rawTxs
    .filter((t) => !t.isIncomeDeposit)
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
  const recentLargeExpenses = expenses.slice(0, 10).map((t) => ({
    name: t.merchantName ?? 'Unknown',
    amount: t.amount,
    date: t.date.toISOString().slice(0, 10),
  }));

  return {
    totalTransactions: rawTxs.length,
    monthsAnalyzed: monthlyData.length,
    avgMonthlyIncome: Math.round(avgIncome),
    avgMonthlySpending: Math.round(avgSpending),
    avgMonthlySavings: avgSavings,
    topSpendingCategories: topCategories,
    recurringCharges,
    recentLargeExpenses,
    debtPaymentInfo: { avgMonthly: Math.round(avgDebt), dtiRatio: Math.round(dtiRatio * 1000) / 1000 },
    emergencyRunway,
    subscriptionCount: Math.round(avgSubs),
    hasPayrollDeposit: hasPayroll,
    incomeSourceCount: Math.round(avgSources),
    overdraftCount: totalOverdrafts,
  };
}

export async function chat(
  request: FastifyRequest<{ Body: ChatBody }>,
  reply: FastifyReply,
): Promise<void> {
  const { message, history = [] } = request.body ?? {};
  if (!message?.trim()) throw new BadRequestError('message is required');

  const user = await prisma.user.findUniqueOrThrow({
    where: { firebaseUid: request.user!.uid },
  });

  const twin = await prisma.twin.findUnique({
    where: { userId: user.id },
    include: { transactions: true },
  });

  let context: FullChatContext;

  if (twin) {
    const monthlyData = rebuildMonthlyData(twin.transactions);
    const txData = twin.transactions.map((t) => ({
      amount: t.amount,
      date: t.date.toISOString(),
      merchantName: t.merchantName,
      vividCategory: t.vividCategory,
      isRecurring: t.isRecurring,
      isIncomeDeposit: t.isIncomeDeposit,
    }));

    const redFlagsReport = generateRedFlagsReport(monthlyData, txData);
    const transactionSummary = buildTransactionSummary(twin.transactions, monthlyData);

    context = {
      scores: {
        overall: twin.overallScore,
        incomeStability: twin.incomeStabilityScore,
        spendingDiscipline: twin.spendingDisciplineScore,
        debtTrajectory: twin.debtTrajectoryScore,
        financialResilience: twin.financialResilienceScore,
        growthMomentum: twin.growthMomentumScore,
        consumerNarrative: twin.consumerNarrative,
      },
      transactions: transactionSummary,
      redFlags: {
        redCount: redFlagsReport.redCount,
        yellowCount: redFlagsReport.yellowCount,
        topFlags: redFlagsReport.flags.map((f) => ({ title: f.title, severity: f.severity })),
      },
      lending: {
        personalLoan: twin.personalLoanReadiness,
        autoLoan: twin.autoLoanReadiness,
        mortgage: twin.mortgageReadiness,
        smallBiz: twin.smallBizReadiness,
      },
      userName: `${user.firstName} ${user.lastName}`,
    };
  } else {
    context = {
      scores: {
        overall: 0, incomeStability: 0, spendingDiscipline: 0,
        debtTrajectory: 0, financialResilience: 0, growthMomentum: 0,
        consumerNarrative: 'No twin generated yet.',
      },
      transactions: {
        totalTransactions: 0, monthsAnalyzed: 0,
        avgMonthlyIncome: 0, avgMonthlySpending: 0, avgMonthlySavings: 0,
        topSpendingCategories: [], recurringCharges: [], recentLargeExpenses: [],
        debtPaymentInfo: { avgMonthly: 0, dtiRatio: 0 },
        emergencyRunway: 0, subscriptionCount: 0, hasPayrollDeposit: false,
        incomeSourceCount: 0, overdraftCount: 0,
      },
      redFlags: { redCount: 0, yellowCount: 0, topFlags: [] },
      lending: { personalLoan: 0, autoLoan: 0, mortgage: 0, smallBiz: 0 },
      userName: `${user.firstName} ${user.lastName}`,
    };
  }

  const response = await generateChatResponse(message, history, context);
  await reply.send({ response });
}
