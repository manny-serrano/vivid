// ---------------------------------------------------------------------------
// Vivid – Pillar Explainability Engine
// Generates 3-5 bullet reasons and 2-3 influential transactions per pillar.
// ---------------------------------------------------------------------------

import {
  mean, standardDeviation, linearRegressionSlope, clamp,
  type MonthlyData, type TransactionData,
} from './scoreCalculator.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InfluentialTransaction {
  date: string;
  merchantName: string;
  amount: number;
  impact: 'positive' | 'negative';
  reason: string;
}

export interface PillarExplanation {
  pillar: string;
  pillarKey: string;
  score: number;
  reasons: string[];
  influentialTransactions: InfluentialTransaction[];
}

export interface ExplainabilityReport {
  pillars: PillarExplanation[];
}

// ---------------------------------------------------------------------------
// Money formatter
// ---------------------------------------------------------------------------

function $(n: number): string {
  return `$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

// ---------------------------------------------------------------------------
// Pillar 1 – Income Stability
// ---------------------------------------------------------------------------

function explainIncomeStability(
  monthlyData: MonthlyData[],
  transactions: TransactionData[],
  score: number,
): PillarExplanation {
  const reasons: string[] = [];
  const deposits = monthlyData.map((m) => m.totalDeposits);
  const avgIncome = mean(deposits);
  const sd = standardDeviation(deposits);
  const cv = avgIncome === 0 ? 1 : sd / avgIncome;

  if (cv < 0.15) {
    reasons.push(`Income is very consistent month-to-month (${(cv * 100).toFixed(0)}% variation) — strong signal of stability.`);
  } else if (cv < 0.35) {
    reasons.push(`Moderate income variation (${(cv * 100).toFixed(0)}%) — some fluctuation but generally predictable.`);
  } else {
    reasons.push(`High income volatility (${(cv * 100).toFixed(0)}% variation) — deposits swing significantly month-to-month, which lowers this score.`);
  }

  const avgSources = mean(monthlyData.map((d) => d.incomeSourceCount));
  if (avgSources >= 2) {
    reasons.push(`Multiple income sources detected (avg ${avgSources.toFixed(1)}/month) — diversification adds a +${Math.min(Math.round(avgSources * 5), 20)}pt bonus.`);
  } else {
    reasons.push(`Only ${avgSources.toFixed(1)} income source on average — limited diversification.`);
  }

  const monthsWithPayroll = monthlyData.filter((d) => d.hasPayrollDeposit).length;
  const payrollFraction = monthsWithPayroll / monthlyData.length;
  if (payrollFraction >= 0.75) {
    reasons.push(`Regular payroll/salary deposits found in ${monthsWithPayroll} of ${monthlyData.length} months — earns a +15pt regularity bonus.`);
  } else if (monthsWithPayroll > 0) {
    reasons.push(`Payroll deposits found in only ${monthsWithPayroll} of ${monthlyData.length} months — not consistent enough for the regularity bonus.`);
  } else {
    reasons.push(`No regular payroll/salary deposits detected — income appears to come from non-traditional sources.`);
  }

  const zeroMonths = deposits.filter((d) => d === 0).length;
  if (zeroMonths > 0) {
    reasons.push(`${zeroMonths} month${zeroMonths > 1 ? 's' : ''} with zero income detected — each costs -8pts.`);
  }

  if (avgIncome > 0) {
    reasons.push(`Average monthly income: ${$(avgIncome)}.`);
  }

  const influential = pickIncomeTransactions(transactions, monthlyData);

  return { pillar: 'Income Stability', pillarKey: 'incomeStabilityScore', score, reasons: reasons.slice(0, 5), influentialTransactions: influential };
}

function pickIncomeTransactions(transactions: TransactionData[], monthlyData: MonthlyData[]): InfluentialTransaction[] {
  const incomeDeposits = transactions
    .filter((t) => t.isIncomeDeposit)
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

  const result: InfluentialTransaction[] = [];

  const largest = incomeDeposits[0];
  if (largest) {
    result.push({
      date: largest.date,
      merchantName: largest.merchantName ?? 'Deposit',
      amount: largest.amount,
      impact: 'positive',
      reason: `Largest deposit (${$(largest.amount)}) — anchors income stability.`,
    });
  }

  const recurring = incomeDeposits.filter((t) => t.isRecurring);
  if (recurring.length > 0) {
    const sample = recurring[0];
    result.push({
      date: sample.date,
      merchantName: sample.merchantName ?? 'Recurring Deposit',
      amount: sample.amount,
      impact: 'positive',
      reason: `Recurring income deposit (${$(sample.amount)}) — regularity boosts the score.`,
    });
  }

  const zeroMonth = monthlyData.find((m) => m.totalDeposits === 0);
  if (zeroMonth) {
    result.push({
      date: `${zeroMonth.month}-15`,
      merchantName: 'No deposits',
      amount: 0,
      impact: 'negative',
      reason: `Zero income in ${zeroMonth.month} — caused an 8-point penalty.`,
    });
  }

  return result.slice(0, 3);
}

// ---------------------------------------------------------------------------
// Pillar 2 – Spending Discipline
// ---------------------------------------------------------------------------

function explainSpendingDiscipline(
  monthlyData: MonthlyData[],
  transactions: TransactionData[],
  score: number,
): PillarExplanation {
  const reasons: string[] = [];
  const totalEssential = monthlyData.reduce((s, d) => s + d.essentialSpending, 0);
  const totalSpending = monthlyData.reduce((s, d) => s + d.totalSpending, 0);
  const essentialRatio = totalSpending === 0 ? 0 : totalEssential / totalSpending;

  reasons.push(`${(essentialRatio * 100).toFixed(0)}% of spending goes to essentials (rent, groceries, utilities) — this ratio drives ${Math.round(essentialRatio * 60)}/60 base points.`);

  const hasSavings = monthlyData.some((d) => d.savingsTransfers > 0);
  if (hasSavings) {
    reasons.push(`Savings transfers detected — earns a +20pt discipline bonus.`);
  } else {
    reasons.push(`No savings transfers detected — missing a potential +20pt bonus.`);
  }

  const totalOverdrafts = monthlyData.reduce((s, d) => s + d.overdraftCount, 0);
  if (totalOverdrafts > 0) {
    reasons.push(`${totalOverdrafts} overdraft${totalOverdrafts > 1 ? 's' : ''} recorded — each costs -5pts.`);
  } else {
    reasons.push(`Zero overdrafts — clean spending history.`);
  }

  const avgSubs = mean(monthlyData.map((d) => d.subscriptionCount));
  if (avgSubs > 8) {
    reasons.push(`High subscription count (avg ${avgSubs.toFixed(1)}/month) — excess beyond 8 penalizes the score.`);
  } else {
    reasons.push(`Subscription count is manageable (avg ${avgSubs.toFixed(1)}/month).`);
  }

  if (monthlyData.length >= 4) {
    const mid = Math.floor(monthlyData.length / 2);
    const first = mean(monthlyData.slice(0, mid).map((d) => d.totalSpending === 0 ? 0 : d.essentialSpending / d.totalSpending));
    const second = mean(monthlyData.slice(mid).map((d) => d.totalSpending === 0 ? 0 : d.essentialSpending / d.totalSpending));
    if (second > first) {
      reasons.push(`Spending discipline is improving over time — earns a +10pt trend bonus.`);
    } else {
      reasons.push(`Spending discipline hasn't improved recently — no trend bonus applied.`);
    }
  }

  const influential = pickSpendingTransactions(transactions);

  return { pillar: 'Spending Discipline', pillarKey: 'spendingDisciplineScore', score, reasons: reasons.slice(0, 5), influentialTransactions: influential };
}

function pickSpendingTransactions(transactions: TransactionData[]): InfluentialTransaction[] {
  const expenses = transactions.filter((t) => !t.isIncomeDeposit).sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
  const result: InfluentialTransaction[] = [];

  const essentialCats = new Set(['rent', 'groceries', 'utilities', 'insurance', 'medical', 'transportation', 'debt_payment']);

  const bigEssential = expenses.find((t) => essentialCats.has(t.vividCategory));
  if (bigEssential) {
    result.push({
      date: bigEssential.date,
      merchantName: bigEssential.merchantName ?? 'Essential',
      amount: bigEssential.amount,
      impact: 'positive',
      reason: `${bigEssential.merchantName ?? 'Essential payment'} (${$(bigEssential.amount)}) — essential spending keeps the ratio healthy.`,
    });
  }

  const bigDiscretionary = expenses.find((t) => !essentialCats.has(t.vividCategory) && t.vividCategory !== 'savings_transfer');
  if (bigDiscretionary) {
    result.push({
      date: bigDiscretionary.date,
      merchantName: bigDiscretionary.merchantName ?? 'Discretionary',
      amount: bigDiscretionary.amount,
      impact: 'negative',
      reason: `${bigDiscretionary.merchantName ?? 'Discretionary spend'} (${$(bigDiscretionary.amount)}) — largest non-essential charge, lowers the essential ratio.`,
    });
  }

  const savingsTransfer = transactions.find((t) => t.vividCategory === 'savings_transfer' && !t.isIncomeDeposit);
  if (savingsTransfer) {
    result.push({
      date: savingsTransfer.date,
      merchantName: savingsTransfer.merchantName ?? 'Savings Transfer',
      amount: savingsTransfer.amount,
      impact: 'positive',
      reason: `Savings transfer (${$(savingsTransfer.amount)}) — demonstrates active saving behavior.`,
    });
  }

  return result.slice(0, 3);
}

// ---------------------------------------------------------------------------
// Pillar 3 – Debt Trajectory
// ---------------------------------------------------------------------------

function explainDebtTrajectory(
  monthlyData: MonthlyData[],
  transactions: TransactionData[],
  score: number,
): PillarExplanation {
  const reasons: string[] = [];
  const monthlyDTI = monthlyData.map((d) => d.totalDeposits === 0 ? 1 : d.debtPayments / d.totalDeposits);
  const avgDTI = mean(monthlyDTI);

  reasons.push(`Average debt-to-income ratio: ${(avgDTI * 100).toFixed(1)}% — ${avgDTI < 0.2 ? 'very healthy' : avgDTI < 0.35 ? 'moderate' : avgDTI < 0.43 ? 'elevated' : 'high, triggering a -15pt penalty'}.`);

  const slope = linearRegressionSlope(monthlyDTI);
  if (slope < -0.001) {
    reasons.push(`DTI is trending downward over time — debt burden is reducing, earning a +20pt bonus.`);
  } else if (slope > 0.001) {
    reasons.push(`DTI is trending upward — debt is growing relative to income, costing -20pts.`);
  } else {
    reasons.push(`DTI is stable over the analysis period — no trend bonus or penalty applied.`);
  }

  if (avgDTI > 0.43) {
    reasons.push(`DTI exceeds 43% threshold — triggers an additional -15pt high-DTI penalty (a key lender red flag).`);
  }

  const avgDebt = mean(monthlyData.map((d) => d.debtPayments));
  const avgIncome = mean(monthlyData.map((d) => d.totalDeposits));
  reasons.push(`Average monthly debt payments: ${$(avgDebt)} on ${$(avgIncome)} income.`);

  const debtTxs = transactions
    .filter((t) => t.vividCategory === 'debt_payment' && !t.isIncomeDeposit)
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

  const influential: InfluentialTransaction[] = [];

  if (debtTxs.length > 0) {
    const largest = debtTxs[0];
    influential.push({
      date: largest.date,
      merchantName: largest.merchantName ?? 'Debt Payment',
      amount: largest.amount,
      impact: avgDTI < 0.35 ? 'positive' : 'negative',
      reason: `Largest debt payment: ${largest.merchantName ?? 'Creditor'} (${$(largest.amount)}) — ${avgDTI < 0.35 ? 'manageable portion of income' : 'significant share of income'}.`,
    });

    const recurring = debtTxs.find((t) => t.isRecurring);
    if (recurring && recurring !== largest) {
      influential.push({
        date: recurring.date,
        merchantName: recurring.merchantName ?? 'Auto-pay',
        amount: recurring.amount,
        impact: 'positive',
        reason: `Recurring debt auto-pay (${$(recurring.amount)}) — consistent payments signal responsible management.`,
      });
    }
  }

  if (monthlyData.length >= 2) {
    const lastDTI = monthlyDTI[monthlyDTI.length - 1];
    const firstDTI = monthlyDTI[0];
    if (lastDTI < firstDTI) {
      influential.push({
        date: monthlyData[monthlyData.length - 1].month + '-15',
        merchantName: 'DTI Improvement',
        amount: 0,
        impact: 'positive',
        reason: `DTI improved from ${(firstDTI * 100).toFixed(1)}% to ${(lastDTI * 100).toFixed(1)}% over the analysis period.`,
      });
    } else if (lastDTI > firstDTI * 1.1) {
      influential.push({
        date: monthlyData[monthlyData.length - 1].month + '-15',
        merchantName: 'DTI Increase',
        amount: 0,
        impact: 'negative',
        reason: `DTI rose from ${(firstDTI * 100).toFixed(1)}% to ${(lastDTI * 100).toFixed(1)}% — debt growing faster than income.`,
      });
    }
  }

  return { pillar: 'Debt Trajectory', pillarKey: 'debtTrajectoryScore', score, reasons: reasons.slice(0, 5), influentialTransactions: influential.slice(0, 3) };
}

// ---------------------------------------------------------------------------
// Pillar 4 – Financial Resilience
// ---------------------------------------------------------------------------

function explainFinancialResilience(
  monthlyData: MonthlyData[],
  transactions: TransactionData[],
  score: number,
): PillarExplanation {
  const reasons: string[] = [];

  const avgExpenses = mean(monthlyData.map((d) => d.totalSpending));
  const minBalance = Math.min(...monthlyData.map((d) => d.endBalance));
  const monthsOfCoverage = avgExpenses === 0 ? 0 : Math.max(minBalance, 0) / avgExpenses;

  if (monthsOfCoverage >= 3) {
    reasons.push(`Lowest balance covers ${monthsOfCoverage.toFixed(1)} months of expenses — strong safety net (earns ${Math.round(Math.min(monthsOfCoverage * 20, 60))}/60 coverage points).`);
  } else if (monthsOfCoverage >= 1) {
    reasons.push(`Lowest balance covers only ${monthsOfCoverage.toFixed(1)} months of expenses — limited cushion (${Math.round(monthsOfCoverage * 20)}/60 coverage points).`);
  } else {
    reasons.push(`Lowest balance provides less than 1 month of expense coverage — very thin safety net.`);
  }

  const allPositive = monthlyData.every((d) => d.endBalance > 0);
  if (allPositive) {
    reasons.push(`Balance stayed positive every month — earns the +20pt buffer bonus.`);
  } else {
    reasons.push(`Balance went negative in at least one month — no buffer bonus awarded.`);
  }

  let hasRecovery = false;
  for (let i = 0; i < monthlyData.length - 1; i++) {
    if (monthlyData[i].totalSpending > avgExpenses * 1.2 && monthlyData[i + 1].totalSpending < avgExpenses) {
      hasRecovery = true;
      break;
    }
  }
  if (hasRecovery) {
    reasons.push(`Recovery pattern detected — after a high-spending month, spending dropped back to normal. Earns +10pt recovery bonus.`);
  } else {
    reasons.push(`No clear recovery pattern after spending spikes — no recovery bonus.`);
  }

  const balances = monthlyData.map((d) => d.endBalance);
  const balMean = mean(balances);
  const balSD = standardDeviation(balances);
  const consistency = balMean === 0 ? 0 : clamp(1 - balSD / Math.abs(balMean), 0, 1);
  if (consistency > 0.7) {
    reasons.push(`Balance is very consistent (${(consistency * 100).toFixed(0)}% stability) — earns +${Math.round(consistency * 10)}pt consistency bonus.`);
  } else {
    reasons.push(`Balance fluctuates significantly (${(consistency * 100).toFixed(0)}% stability) — only +${Math.round(consistency * 10)}pt consistency bonus.`);
  }

  const influential: InfluentialTransaction[] = [];
  const sorted = transactions.filter((t) => !t.isIncomeDeposit).sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
  const bigSpend = sorted[0];
  if (bigSpend) {
    influential.push({
      date: bigSpend.date,
      merchantName: bigSpend.merchantName ?? 'Large Expense',
      amount: bigSpend.amount,
      impact: 'negative',
      reason: `Largest single expense (${$(bigSpend.amount)}) — tests your balance cushion.`,
    });
  }

  const bigDeposit = transactions.filter((t) => t.isIncomeDeposit).sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))[0];
  if (bigDeposit) {
    influential.push({
      date: bigDeposit.date,
      merchantName: bigDeposit.merchantName ?? 'Large Deposit',
      amount: bigDeposit.amount,
      impact: 'positive',
      reason: `Largest deposit (${$(bigDeposit.amount)}) — replenishes your financial buffer.`,
    });
  }

  const autoPayments = transactions.filter((t) => t.isRecurring && !t.isIncomeDeposit && (t.vividCategory === 'rent' || t.vividCategory === 'utilities' || t.vividCategory === 'insurance'));
  if (autoPayments.length > 0) {
    const sample = autoPayments[0];
    influential.push({
      date: sample.date,
      merchantName: sample.merchantName ?? 'Auto-pay',
      amount: sample.amount,
      impact: 'positive',
      reason: `${sample.merchantName ?? 'Essential'} auto-pay (${$(sample.amount)}) — recurring essentials covered reliably.`,
    });
  }

  return { pillar: 'Financial Resilience', pillarKey: 'financialResilienceScore', score, reasons: reasons.slice(0, 5), influentialTransactions: influential.slice(0, 3) };
}

// ---------------------------------------------------------------------------
// Pillar 5 – Growth Momentum
// ---------------------------------------------------------------------------

function explainGrowthMomentum(
  monthlyData: MonthlyData[],
  transactions: TransactionData[],
  score: number,
): PillarExplanation {
  const reasons: string[] = [];

  const netSavings = monthlyData.map((d) => d.totalDeposits - d.totalSpending);
  const avgDeposits = mean(monthlyData.map((d) => d.totalDeposits));
  const avgSavingsRate = avgDeposits === 0 ? 0 : mean(netSavings) / avgDeposits;

  if (avgSavingsRate > 0.15) {
    reasons.push(`Strong savings rate of ${(avgSavingsRate * 100).toFixed(1)}% — you're keeping a healthy portion of income (earns ${Math.round(Math.max(avgSavingsRate, 0) * 60)}/60 base points).`);
  } else if (avgSavingsRate > 0) {
    reasons.push(`Modest savings rate of ${(avgSavingsRate * 100).toFixed(1)}% — positive but room to grow (earns ${Math.round(avgSavingsRate * 60)}/60 base points).`);
  } else {
    reasons.push(`Negative or zero savings rate (${(avgSavingsRate * 100).toFixed(1)}%) — spending exceeds income on average.`);
  }

  const incomeGrowthRate = linearRegressionSlope(monthlyData.map((d) => d.totalDeposits));
  const normalizedGrowth = avgDeposits === 0 ? 0 : incomeGrowthRate / avgDeposits;
  if (normalizedGrowth > 0) {
    reasons.push(`Income is growing over time (+${$(incomeGrowthRate)}/month trend) — earns up to +${Math.round(Math.min(normalizedGrowth * 100, 20))}pt growth bonus.`);
  } else if (normalizedGrowth < -0.01) {
    reasons.push(`Income is declining over time (${$(incomeGrowthRate)}/month trend) — no growth bonus and a warning sign.`);
  } else {
    reasons.push(`Income is flat — no growth bonus applied.`);
  }

  const investmentKeywords = ['investment', 'brokerage', 'etf'];
  const hasInvestment = transactions.some((t) => investmentKeywords.some((kw) => t.vividCategory.toLowerCase().includes(kw)));
  if (hasInvestment) {
    reasons.push(`Investment/brokerage activity detected — earns a +15pt investment bonus.`);
  } else {
    reasons.push(`No investment or brokerage activity detected — missing a potential +15pt bonus.`);
  }

  const monthsPositive = netSavings.filter((n) => n > 0).length;
  reasons.push(`Positive net savings in ${monthsPositive} of ${monthlyData.length} months.`);

  const influential: InfluentialTransaction[] = [];

  const investmentTxs = transactions.filter((t) => investmentKeywords.some((kw) => t.vividCategory.toLowerCase().includes(kw)));
  if (investmentTxs.length > 0) {
    const sample = investmentTxs[0];
    influential.push({
      date: sample.date,
      merchantName: sample.merchantName ?? 'Investment',
      amount: sample.amount,
      impact: 'positive',
      reason: `Investment transaction (${$(sample.amount)}) — contributes to the +15pt investment bonus.`,
    });
  }

  const bestMonth = monthlyData.reduce((best, m) => (m.totalDeposits - m.totalSpending) > (best.totalDeposits - best.totalSpending) ? m : best, monthlyData[0]);
  if (bestMonth && bestMonth.totalDeposits > bestMonth.totalSpending) {
    influential.push({
      date: bestMonth.month + '-15',
      merchantName: 'Best Savings Month',
      amount: bestMonth.totalDeposits - bestMonth.totalSpending,
      impact: 'positive',
      reason: `Best month (${bestMonth.month}): saved ${$(bestMonth.totalDeposits - bestMonth.totalSpending)} — ${((bestMonth.totalDeposits - bestMonth.totalSpending) / bestMonth.totalDeposits * 100).toFixed(0)}% savings rate.`,
    });
  }

  const worstMonth = monthlyData.reduce((worst, m) => (m.totalDeposits - m.totalSpending) < (worst.totalDeposits - worst.totalSpending) ? m : worst, monthlyData[0]);
  if (worstMonth && worstMonth.totalDeposits < worstMonth.totalSpending) {
    influential.push({
      date: worstMonth.month + '-15',
      merchantName: 'Worst Savings Month',
      amount: worstMonth.totalDeposits - worstMonth.totalSpending,
      impact: 'negative',
      reason: `Worst month (${worstMonth.month}): overspent by ${$(worstMonth.totalSpending - worstMonth.totalDeposits)} — drags down average savings rate.`,
    });
  }

  return { pillar: 'Growth Momentum', pillarKey: 'growthMomentumScore', score, reasons: reasons.slice(0, 5), influentialTransactions: influential.slice(0, 3) };
}

// ---------------------------------------------------------------------------
// Public API – generate full report
// ---------------------------------------------------------------------------

export function generateExplainabilityReport(
  monthlyData: MonthlyData[],
  transactions: TransactionData[],
  scores: {
    incomeStabilityScore: number;
    spendingDisciplineScore: number;
    debtTrajectoryScore: number;
    financialResilienceScore: number;
    growthMomentumScore: number;
  },
): ExplainabilityReport {
  return {
    pillars: [
      explainIncomeStability(monthlyData, transactions, scores.incomeStabilityScore),
      explainSpendingDiscipline(monthlyData, transactions, scores.spendingDisciplineScore),
      explainDebtTrajectory(monthlyData, transactions, scores.debtTrajectoryScore),
      explainFinancialResilience(monthlyData, transactions, scores.financialResilienceScore),
      explainGrowthMomentum(monthlyData, transactions, scores.growthMomentumScore),
    ],
  };
}
