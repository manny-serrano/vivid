// ---------------------------------------------------------------------------
// Vivid Financial Twin – Core Scoring Engine
// ---------------------------------------------------------------------------

/** Monthly aggregate data derived from categorized transactions. */
export interface MonthlyData {
  month: string; // YYYY-MM
  totalDeposits: number;
  totalSpending: number;
  essentialSpending: number;
  discretionarySpending: number;
  debtPayments: number;
  savingsTransfers: number;
  endBalance: number;
  incomeSourceCount: number;
  overdraftCount: number;
  subscriptionCount: number;
  hasPayrollDeposit: boolean;
}

/** Enriched transaction record used by the scoring pipeline. */
export interface TransactionData {
  amount: number;
  date: string;
  merchantName: string | null;
  vividCategory: string;
  isRecurring: boolean;
  isIncomeDeposit: boolean;
}

/** Complete set of Vivid scores. */
export interface VividScores {
  incomeStability: number;
  spendingDiscipline: number;
  debtTrajectory: number;
  financialResilience: number;
  growthMomentum: number;
  overall: number;
}

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

/**
 * Clamp a numeric value to the inclusive range [lo, hi].
 */
export function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

/**
 * Compute the arithmetic mean of a numeric array.
 * Returns 0 for an empty array.
 */
export function mean(arr: readonly number[]): number {
  if (arr.length === 0) return 0;
  let sum = 0;
  for (const v of arr) sum += v;
  return sum / arr.length;
}

/**
 * Compute the population standard deviation of a numeric array.
 * Returns 0 for arrays with fewer than 2 elements.
 */
export function standardDeviation(arr: readonly number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  let sumSq = 0;
  for (const v of arr) sumSq += (v - m) ** 2;
  return Math.sqrt(sumSq / arr.length);
}

/**
 * Ordinary-least-squares slope of y-values over their positional indices.
 *
 * Given y₀, y₁, …, yₙ₋₁ the slope is fitted against x = 0, 1, …, n-1.
 * Returns 0 when the array has fewer than 2 elements.
 */
export function linearRegressionSlope(values: readonly number[]): number {
  const n = values.length;
  if (n < 2) return 0;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

// ---------------------------------------------------------------------------
// Pillar 1 – Income Stability
// ---------------------------------------------------------------------------

/**
 * Score income stability based on deposit volatility, source diversity,
 * payroll regularity, and zero-income penalties.
 *
 * @returns Score in the range [0, 100].
 */
export function calculateIncomeStability(monthlyData: MonthlyData[]): number {
  if (monthlyData.length === 0) return 0;

  const deposits = monthlyData.map((m) => m.totalDeposits);
  const m = mean(deposits);
  const sd = standardDeviation(deposits);

  const coefficientOfVariation = m === 0 ? 1 : sd / m;
  const base = 100 - coefficientOfVariation * 100;

  const avgIncomeSourceCount = mean(
    monthlyData.map((d) => d.incomeSourceCount),
  );
  const multiSourceBonus = Math.min(avgIncomeSourceCount * 5, 20);

  const monthsWithPayroll = monthlyData.filter(
    (d) => d.hasPayrollDeposit,
  ).length;
  const payrollFraction = monthsWithPayroll / monthlyData.length;
  const regularityBonus = payrollFraction >= 0.75 ? 15 : 0;

  const monthsWithZeroIncome = deposits.filter((d) => d === 0).length;
  const zeroPenalty = monthsWithZeroIncome * -8;

  return clamp(
    base + multiSourceBonus + regularityBonus + zeroPenalty,
    0,
    100,
  );
}

// ---------------------------------------------------------------------------
// Pillar 2 – Spending Discipline
// ---------------------------------------------------------------------------

/**
 * Score spending discipline based on essential-vs-discretionary ratio,
 * savings behaviour, overdraft history, subscription load, and trend.
 *
 * @returns Score in the range [0, 100].
 */
export function calculateSpendingDiscipline(monthlyData: MonthlyData[]): number {
  if (monthlyData.length === 0) return 0;

  const totalEssential = monthlyData.reduce(
    (s, d) => s + d.essentialSpending,
    0,
  );
  const totalSpending = monthlyData.reduce((s, d) => s + d.totalSpending, 0);

  const essentialRatio = totalSpending === 0 ? 0 : totalEssential / totalSpending;
  const base = essentialRatio * 60;

  const savingsBonus = monthlyData.some((d) => d.savingsTransfers > 0) ? 20 : 0;

  const totalOverdrafts = monthlyData.reduce(
    (s, d) => s + d.overdraftCount,
    0,
  );
  const overdraftPenalty = totalOverdrafts * -5;

  const avgSubscriptions = mean(monthlyData.map((d) => d.subscriptionCount));
  const subscriptionPenalty = Math.max(0, avgSubscriptions - 8) * -2;

  // Trend: compare discipline (essential ratio) of first half vs. second half
  let trendBonus = 0;
  if (monthlyData.length >= 4) {
    const mid = Math.floor(monthlyData.length / 2);
    const firstHalfRatios = monthlyData.slice(0, mid).map((d) =>
      d.totalSpending === 0 ? 0 : d.essentialSpending / d.totalSpending,
    );
    const secondHalfRatios = monthlyData.slice(mid).map((d) =>
      d.totalSpending === 0 ? 0 : d.essentialSpending / d.totalSpending,
    );
    if (mean(secondHalfRatios) > mean(firstHalfRatios)) {
      trendBonus = 10;
    }
  }

  return clamp(
    base + savingsBonus + overdraftPenalty + subscriptionPenalty + trendBonus,
    0,
    100,
  );
}

// ---------------------------------------------------------------------------
// Pillar 3 – Debt Trajectory
// ---------------------------------------------------------------------------

/**
 * Score debt trajectory from debt-to-income ratios, DTI trend via linear
 * regression, and high-DTI penalties.
 *
 * @returns Score in the range [0, 100].
 */
export function calculateDebtTrajectory(monthlyData: MonthlyData[]): number {
  if (monthlyData.length === 0) return 0;

  const monthlyDTI = monthlyData.map((d) =>
    d.totalDeposits === 0 ? 1 : d.debtPayments / d.totalDeposits,
  );

  const avgDTI = mean(monthlyDTI);
  const base = 100 - avgDTI * 100;

  const slope = linearRegressionSlope(monthlyDTI);
  const trendBonus = slope < -0.001 ? 20 : slope > 0.001 ? -20 : 0;

  const highDTIPenalty = avgDTI > 0.43 ? -15 : 0;

  return clamp(base + trendBonus + highDTIPenalty, 0, 100);
}

// ---------------------------------------------------------------------------
// Pillar 4 – Financial Resilience
// ---------------------------------------------------------------------------

/**
 * Score financial resilience from balance coverage, overdraft-free streaks,
 * recovery behaviour, and balance consistency.
 *
 * @returns Score in the range [0, 100].
 */
export function calculateFinancialResilience(
  monthlyData: MonthlyData[],
): number {
  if (monthlyData.length === 0) return 0;

  const avgMonthlyExpenses = mean(monthlyData.map((d) => d.totalSpending));
  const minBalance = Math.min(...monthlyData.map((d) => d.endBalance));
  const monthsOfCoverage =
    avgMonthlyExpenses === 0 ? 0 : Math.max(minBalance, 0) / avgMonthlyExpenses;
  const coverageScore = Math.min(monthsOfCoverage * 20, 60);

  const bufferBonus = monthlyData.every((d) => d.endBalance > 0) ? 20 : 0;

  // Recovery: a month of high spending (>120 % of average) followed by lower spending
  let hasRecovery = false;
  for (let i = 0; i < monthlyData.length - 1; i++) {
    if (
      monthlyData[i].totalSpending > avgMonthlyExpenses * 1.2 &&
      monthlyData[i + 1].totalSpending < avgMonthlyExpenses
    ) {
      hasRecovery = true;
      break;
    }
  }
  const recoveryBonus = hasRecovery ? 10 : 0;

  const balances = monthlyData.map((d) => d.endBalance);
  const balMean = mean(balances);
  const balSD = standardDeviation(balances);
  const balanceConsistency =
    balMean === 0 ? 0 : clamp(1 - balSD / Math.abs(balMean), 0, 1);
  const consistencyBonus = balanceConsistency * 10;

  return clamp(
    coverageScore + bufferBonus + recoveryBonus + consistencyBonus,
    0,
    100,
  );
}

// ---------------------------------------------------------------------------
// Pillar 5 – Growth Momentum
// ---------------------------------------------------------------------------

/**
 * Score growth momentum from savings rate, income growth trend, and
 * investment activity detected in transaction categories.
 *
 * @returns Score in the range [0, 100].
 */
export function calculateGrowthMomentum(
  monthlyData: MonthlyData[],
  transactions: TransactionData[],
): number {
  if (monthlyData.length === 0) return 0;

  const netSavings = monthlyData.map(
    (d) => d.totalDeposits - d.totalSpending,
  );
  const avgDeposits = mean(monthlyData.map((d) => d.totalDeposits));
  const avgSavingsRate =
    avgDeposits === 0 ? 0 : mean(netSavings) / avgDeposits;
  const savingsRateScore = Math.max(avgSavingsRate, 0) * 60;

  const incomeGrowthRate = linearRegressionSlope(
    monthlyData.map((d) => d.totalDeposits),
  );
  const normalizedGrowth =
    avgDeposits === 0 ? 0 : incomeGrowthRate / avgDeposits;
  const incomeGrowthBonus =
    normalizedGrowth > 0 ? Math.min(normalizedGrowth * 100, 20) : 0;

  const investmentKeywords = ['investment', 'brokerage', 'etf'];
  const hasInvestment = transactions.some((t) =>
    investmentKeywords.some((kw) => t.vividCategory.toLowerCase().includes(kw)),
  );
  const investmentBonus = hasInvestment ? 15 : 0;

  return clamp(
    savingsRateScore + incomeGrowthBonus + investmentBonus,
    0,
    100,
  );
}

// ---------------------------------------------------------------------------
// Overall weighted score
// ---------------------------------------------------------------------------

/** Weight configuration for the five pillars. */
interface PillarScores {
  incomeStability: number;
  spendingDiscipline: number;
  debtTrajectory: number;
  financialResilience: number;
  growthMomentum: number;
}

/**
 * Compute the weighted overall Vivid score.
 *
 * Weights: income 0.25, discipline 0.20, debt 0.20, resilience 0.20, growth 0.15.
 *
 * @returns Score in the range [0, 100].
 */
export function calculateOverallScore(scores: PillarScores): number {
  const weighted =
    scores.incomeStability * 0.25 +
    scores.spendingDiscipline * 0.2 +
    scores.debtTrajectory * 0.2 +
    scores.financialResilience * 0.2 +
    scores.growthMomentum * 0.15;

  return clamp(Math.round(weighted * 100) / 100, 0, 100);
}

// ---------------------------------------------------------------------------
// Convenience – calculate everything at once
// ---------------------------------------------------------------------------

/**
 * Calculate all five pillar scores plus the weighted overall score.
 *
 * @returns A {@link VividScores} object with every pillar and the overall.
 */
export function calculateAllScores(
  monthlyData: MonthlyData[],
  transactions: TransactionData[],
): VividScores {
  const incomeStability = calculateIncomeStability(monthlyData);
  const spendingDiscipline = calculateSpendingDiscipline(monthlyData);
  const debtTrajectory = calculateDebtTrajectory(monthlyData);
  const financialResilience = calculateFinancialResilience(monthlyData);
  const growthMomentum = calculateGrowthMomentum(monthlyData, transactions);

  const overall = calculateOverallScore({
    incomeStability,
    spendingDiscipline,
    debtTrajectory,
    financialResilience,
    growthMomentum,
  });

  return {
    incomeStability,
    spendingDiscipline,
    debtTrajectory,
    financialResilience,
    growthMomentum,
    overall,
  };
}
