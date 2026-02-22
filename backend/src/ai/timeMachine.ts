// ---------------------------------------------------------------------------
// Vivid Time Machine™ — "Show me who I'll be in 12 months."
// Projects the user's financial future under different life decisions
// using their actual transaction behavior patterns.
// ---------------------------------------------------------------------------

import {
  calculateAllScores, calculateOverallScore,
  mean, linearRegressionSlope, clamp,
  type MonthlyData, type TransactionData, type VividScores,
} from './scoreCalculator.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScenarioModifier {
  id: string;
  label: string;
  description: string;
  incomeChangePercent: number;
  extraMonthlySavings: number;
  extraMonthlyDebtPayment: number;
  monthlyExpenseChange: number;
  subscriptionsCancelled: number;
  oneTimeExpense: number;
  switchToSalaried: boolean;
  loseIncomeStream: boolean;
}

export interface ProjectedMonth {
  month: string;
  totalDeposits: number;
  totalSpending: number;
  debtPayments: number;
  savingsTransfers: number;
  endBalance: number;
  netSavings: number;
}

export interface TimeMachineResult {
  currentScores: VividScores;
  projectedScores: VividScores;
  scoreDeltas: Record<string, number>;
  projectedMonths: ProjectedMonth[];
  metrics: {
    currentNetWorth: number;
    projectedNetWorth: number;
    netWorthChange: number;
    currentEmergencyRunway: number;
    projectedEmergencyRunway: number;
    loanApprovalProbability: number;
    overdraftProbability: number;
    totalSavedOrLost: number;
    projectedDebtRemaining: number;
  };
  activeModifiers: string[];
  monthsProjected: number;
}

// ---------------------------------------------------------------------------
// Built-in scenario presets
// ---------------------------------------------------------------------------

export const PRESET_SCENARIOS: Omit<ScenarioModifier, 'id'>[] = [
  {
    label: 'Keep Living Like This',
    description: 'Project your current habits forward with no changes.',
    incomeChangePercent: 0, extraMonthlySavings: 0, extraMonthlyDebtPayment: 0,
    monthlyExpenseChange: 0, subscriptionsCancelled: 0, oneTimeExpense: 0,
    switchToSalaried: false, loseIncomeStream: false,
  },
  {
    label: '+$200/month to savings',
    description: 'Redirect $200 each month into savings instead of spending.',
    incomeChangePercent: 0, extraMonthlySavings: 200, extraMonthlyDebtPayment: 0,
    monthlyExpenseChange: -200, subscriptionsCancelled: 0, oneTimeExpense: 0,
    switchToSalaried: false, loseIncomeStream: false,
  },
  {
    label: 'Cancel Netflix + DoorDash',
    description: 'Drop unnecessary streaming and food delivery subscriptions.',
    incomeChangePercent: 0, extraMonthlySavings: 0, extraMonthlyDebtPayment: 0,
    monthlyExpenseChange: -45, subscriptionsCancelled: 2, oneTimeExpense: 0,
    switchToSalaried: false, loseIncomeStream: false,
  },
  {
    label: 'Pay extra $300 toward debt',
    description: 'Accelerate debt payoff with an extra $300/month.',
    incomeChangePercent: 0, extraMonthlySavings: 0, extraMonthlyDebtPayment: 300,
    monthlyExpenseChange: 0, subscriptionsCancelled: 0, oneTimeExpense: 0,
    switchToSalaried: false, loseIncomeStream: false,
  },
  {
    label: 'Lose one income stream',
    description: 'Simulate losing your smallest income source.',
    incomeChangePercent: 0, extraMonthlySavings: 0, extraMonthlyDebtPayment: 0,
    monthlyExpenseChange: 0, subscriptionsCancelled: 0, oneTimeExpense: 0,
    switchToSalaried: false, loseIncomeStream: true,
  },
  {
    label: 'Switch to salaried job',
    description: 'Replace volatile gig income with a steady paycheck.',
    incomeChangePercent: 0, extraMonthlySavings: 0, extraMonthlyDebtPayment: 0,
    monthlyExpenseChange: 0, subscriptionsCancelled: 0, oneTimeExpense: 0,
    switchToSalaried: true, loseIncomeStream: false,
  },
  {
    label: 'Raise income 15%',
    description: 'Get a raise, new client, or side hustle boost.',
    incomeChangePercent: 15, extraMonthlySavings: 0, extraMonthlyDebtPayment: 0,
    monthlyExpenseChange: 0, subscriptionsCancelled: 0, oneTimeExpense: 0,
    switchToSalaried: false, loseIncomeStream: false,
  },
  {
    label: 'Emergency expense $2,000',
    description: 'Hit with an unexpected $2,000 bill (medical, car, etc.).',
    incomeChangePercent: 0, extraMonthlySavings: 0, extraMonthlyDebtPayment: 0,
    monthlyExpenseChange: 0, subscriptionsCancelled: 0, oneTimeExpense: 2000,
    switchToSalaried: false, loseIncomeStream: false,
  },
];

// ---------------------------------------------------------------------------
// Simulation engine
// ---------------------------------------------------------------------------

export function simulateTimeMachine(
  historicalMonthly: MonthlyData[],
  transactions: TransactionData[],
  modifiers: ScenarioModifier[],
  monthsForward: number = 12,
): TimeMachineResult {
  if (historicalMonthly.length === 0) {
    const emptyScores: VividScores = {
      incomeStability: 0, spendingDiscipline: 0, debtTrajectory: 0,
      financialResilience: 0, growthMomentum: 0, overall: 0,
    };
    return {
      currentScores: emptyScores, projectedScores: emptyScores,
      scoreDeltas: {}, projectedMonths: [], metrics: {
        currentNetWorth: 0, projectedNetWorth: 0, netWorthChange: 0,
        currentEmergencyRunway: 0, projectedEmergencyRunway: 0,
        loanApprovalProbability: 0, overdraftProbability: 0,
        totalSavedOrLost: 0, projectedDebtRemaining: 0,
      },
      activeModifiers: [], monthsProjected: 0,
    };
  }

  const currentScores = calculateAllScores(historicalMonthly, transactions);

  // --- Extract behavioral patterns from real data ---
  const avgIncome = mean(historicalMonthly.map((m) => m.totalDeposits));
  const avgSpending = mean(historicalMonthly.map((m) => m.totalSpending));
  const avgEssential = mean(historicalMonthly.map((m) => m.essentialSpending));
  const avgDiscretionary = mean(historicalMonthly.map((m) => m.discretionarySpending));
  const avgDebt = mean(historicalMonthly.map((m) => m.debtPayments));
  const avgSavings = mean(historicalMonthly.map((m) => m.savingsTransfers));
  const avgSubs = mean(historicalMonthly.map((m) => m.subscriptionCount));
  const avgSources = mean(historicalMonthly.map((m) => m.incomeSourceCount));
  const latestBalance = historicalMonthly[historicalMonthly.length - 1].endBalance;
  const incomeGrowthSlope = linearRegressionSlope(historicalMonthly.map((m) => m.totalDeposits));
  const hasPayroll = historicalMonthly.some((m) => m.hasPayrollDeposit);

  // Income volatility from real data
  const incomeStdDev = (() => {
    const incomes = historicalMonthly.map((m) => m.totalDeposits);
    const m = mean(incomes);
    let sumSq = 0;
    for (const v of incomes) sumSq += (v - m) ** 2;
    return Math.sqrt(sumSq / incomes.length);
  })();

  // --- Aggregate modifiers ---
  let totalIncomeChangePct = 0;
  let totalExtraSavings = 0;
  let totalExtraDebt = 0;
  let totalExpenseChange = 0;
  let totalSubsCancelled = 0;
  let totalOneTime = 0;
  let switchToSalaried = false;
  let loseStream = false;
  const activeLabels: string[] = [];

  for (const mod of modifiers) {
    totalIncomeChangePct += mod.incomeChangePercent;
    totalExtraSavings += mod.extraMonthlySavings;
    totalExtraDebt += mod.extraMonthlyDebtPayment;
    totalExpenseChange += mod.monthlyExpenseChange;
    totalSubsCancelled += mod.subscriptionsCancelled;
    totalOneTime += mod.oneTimeExpense;
    if (mod.switchToSalaried) switchToSalaried = true;
    if (mod.loseIncomeStream) loseStream = true;
    activeLabels.push(mod.label);
  }

  // --- Build projected months ---
  const projectedMonths: ProjectedMonth[] = [];
  let runningBalance = latestBalance;
  const lastMonth = historicalMonthly[historicalMonthly.length - 1];
  const baseDate = new Date(lastMonth.month + '-01');
  let totalDebtPaid = 0;
  let overdraftEvents = 0;

  for (let i = 1; i <= monthsForward; i++) {
    const monthDate = new Date(baseDate);
    monthDate.setMonth(monthDate.getMonth() + i);
    const monthStr = monthDate.toISOString().slice(0, 7);

    // Income projection
    let projectedIncome = avgIncome;
    projectedIncome += incomeGrowthSlope * i;
    projectedIncome *= (1 + totalIncomeChangePct / 100);

    if (loseStream && avgSources > 1) {
      projectedIncome *= (avgSources - 1) / avgSources;
    }

    if (switchToSalaried) {
      // Steady paycheck eliminates volatility
      projectedIncome = projectedIncome; // amount stays, but volatility drops to ~0
    }

    projectedIncome = Math.max(0, projectedIncome);

    // Spending projection
    let projectedSpending = avgSpending + totalExpenseChange;
    projectedSpending -= totalExtraSavings;

    if (totalSubsCancelled > 0) {
      const avgSubCost = avgSubs > 0 ? (avgDiscretionary * 0.15) / avgSubs : 12;
      projectedSpending -= totalSubsCancelled * avgSubCost;
    }

    // One-time expense hits in month 1
    if (i === 1) projectedSpending += totalOneTime;

    projectedSpending = Math.max(0, projectedSpending);

    // Debt payments
    const projectedDebt = Math.max(0, avgDebt + totalExtraDebt);
    totalDebtPaid += projectedDebt;

    // Savings
    const projectedSavings = avgSavings + totalExtraSavings;

    // Balance
    const netSavings = projectedIncome - projectedSpending;
    runningBalance += netSavings;
    if (runningBalance < 0) overdraftEvents++;

    projectedMonths.push({
      month: monthStr,
      totalDeposits: Math.round(projectedIncome),
      totalSpending: Math.round(projectedSpending),
      debtPayments: Math.round(projectedDebt),
      savingsTransfers: Math.round(projectedSavings),
      endBalance: Math.round(runningBalance),
      netSavings: Math.round(netSavings),
    });
  }

  // --- Build synthetic MonthlyData for the scoring engine ---
  const syntheticMonthly: MonthlyData[] = projectedMonths.map((pm) => {
    const essentialRatio = avgSpending > 0 ? avgEssential / avgSpending : 0.5;
    const projSubCount = Math.max(0, avgSubs - totalSubsCancelled);

    return {
      month: pm.month,
      totalDeposits: pm.totalDeposits,
      totalSpending: pm.totalSpending,
      essentialSpending: Math.round(pm.totalSpending * essentialRatio),
      discretionarySpending: Math.round(pm.totalSpending * (1 - essentialRatio)),
      debtPayments: pm.debtPayments,
      savingsTransfers: pm.savingsTransfers,
      endBalance: pm.endBalance,
      incomeSourceCount: loseStream ? Math.max(1, Math.round(avgSources) - 1) : Math.round(avgSources),
      overdraftCount: pm.endBalance < 0 ? 1 : 0,
      subscriptionCount: Math.round(projSubCount),
      hasPayrollDeposit: switchToSalaried ? true : hasPayroll,
    };
  });

  // Synthetic transactions for growth momentum scoring
  const syntheticTxs: TransactionData[] = transactions.map((t) => ({ ...t }));

  // Calculate projected scores using the synthetic future data
  const projectedScores = calculateAllScores(syntheticMonthly, syntheticTxs);

  // --- Compute deltas ---
  const scoreDeltas: Record<string, number> = {
    incomeStability: Math.round((projectedScores.incomeStability - currentScores.incomeStability) * 10) / 10,
    spendingDiscipline: Math.round((projectedScores.spendingDiscipline - currentScores.spendingDiscipline) * 10) / 10,
    debtTrajectory: Math.round((projectedScores.debtTrajectory - currentScores.debtTrajectory) * 10) / 10,
    financialResilience: Math.round((projectedScores.financialResilience - currentScores.financialResilience) * 10) / 10,
    growthMomentum: Math.round((projectedScores.growthMomentum - currentScores.growthMomentum) * 10) / 10,
    overall: Math.round((projectedScores.overall - currentScores.overall) * 10) / 10,
  };

  // --- Derived metrics ---
  const projectedNetWorth = runningBalance;
  const netWorthChange = projectedNetWorth - latestBalance;
  const avgProjectedExpenses = mean(projectedMonths.map((m) => m.totalSpending));
  const projectedEmergencyRunway = avgProjectedExpenses > 0
    ? Math.max(0, Math.floor(runningBalance / avgProjectedExpenses))
    : 0;
  const currentEmergencyRunway = avgSpending > 0
    ? Math.max(0, Math.floor(Math.max(latestBalance, 0) / avgSpending))
    : 0;

  // Loan approval probability based on projected overall score
  const loanProb = clamp(
    projectedScores.overall >= 80 ? 0.92
      : projectedScores.overall >= 70 ? 0.78
      : projectedScores.overall >= 60 ? 0.55
      : projectedScores.overall >= 50 ? 0.35
      : projectedScores.overall >= 40 ? 0.18
      : 0.05,
    0, 1,
  );

  // Overdraft probability based on negative balance months
  const overdraftProb = clamp(overdraftEvents / monthsForward, 0, 1);

  const totalSavedOrLost = projectedMonths.reduce((s, m) => s + m.netSavings, 0);

  // Rough debt remaining estimate
  const estimatedCurrentDebt = avgDebt * 12 * 3; // rough 3-year assumption
  const projectedDebtRemaining = Math.max(0, estimatedCurrentDebt - totalDebtPaid);

  return {
    currentScores,
    projectedScores,
    scoreDeltas,
    projectedMonths,
    metrics: {
      currentNetWorth: Math.round(latestBalance),
      projectedNetWorth: Math.round(projectedNetWorth),
      netWorthChange: Math.round(netWorthChange),
      currentEmergencyRunway,
      projectedEmergencyRunway,
      loanApprovalProbability: Math.round(loanProb * 100),
      overdraftProbability: Math.round(overdraftProb * 100),
      totalSavedOrLost: Math.round(totalSavedOrLost),
      projectedDebtRemaining: Math.round(projectedDebtRemaining),
    },
    activeModifiers: activeLabels,
    monthsProjected: monthsForward,
  };
}
