// ---------------------------------------------------------------------------
// Vivid – "Your Financial Red Flags" Report
// The things banks see but never tell you.
// ---------------------------------------------------------------------------

import {
  mean, standardDeviation, linearRegressionSlope, clamp,
  type MonthlyData, type TransactionData,
} from './scoreCalculator.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FlagSeverity = 'red' | 'yellow' | 'green';

export interface FixTimeline {
  period: '30 days' | '3 months' | '6 months' | '9 months' | '1 year';
  action: string;
  impact: string;
}

export interface RedFlag {
  id: string;
  severity: FlagSeverity;
  title: string;
  detail: string;
  metric: string;
  lenderPerspective: string;
  fixes: FixTimeline[];
}

export interface RedFlagsReport {
  flags: RedFlag[];
  redCount: number;
  yellowCount: number;
  greenCount: number;
  summary: string;
  loanReadinessVerdict: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function $(n: number): string {
  return `$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

// ---------------------------------------------------------------------------
// Detection engine — each detector returns 0 or 1 flag
// ---------------------------------------------------------------------------

function detectIncomeVolatility(monthly: MonthlyData[]): RedFlag | null {
  const deposits = monthly.map((m) => m.totalDeposits);
  const avg = mean(deposits);
  if (avg === 0) return null;
  const cv = standardDeviation(deposits) / avg;

  const missedCycles = deposits.filter((d) => d < avg * 0.4).length;

  if (cv < 0.2 && missedCycles === 0) return null;

  const severity: FlagSeverity = cv > 0.4 || missedCycles >= 3 ? 'red' : cv > 0.25 || missedCycles >= 1 ? 'yellow' : 'green';

  return {
    id: 'income_volatility',
    severity,
    title: `Income volatility: ${missedCycles > 0 ? `${missedCycles} missed/low deposit cycle${missedCycles > 1 ? 's' : ''}` : `${(cv * 100).toFixed(0)}% variation`}`,
    detail: `Your monthly income swings by ${(cv * 100).toFixed(0)}% on average (${$(avg)}/mo avg). Lenders see ${missedCycles} month${missedCycles !== 1 ? 's' : ''} where deposits dropped below 40% of your average.`,
    metric: `CV: ${(cv * 100).toFixed(0)}% | Missed: ${missedCycles}`,
    lenderPerspective: 'Lenders calculate a "deposit consistency score." Wide swings or missed cycles signal gig/freelance risk and lower your internal approval score by 15-25%.',
    fixes: [
      { period: '30 days', action: 'Set up automatic transfers so income from all sources funnels into one primary account on consistent dates.', impact: 'Reduces appearance of volatility on bank statements.' },
      { period: '3 months', action: 'Build a 1-month income buffer so even in low months, your checking account shows consistent balances.', impact: 'Eliminates missed-cycle flags.' },
      { period: '6 months', action: 'Diversify income sources or negotiate retainers/contracts with guaranteed minimums.', impact: 'Structural fix that improves your income stability score by 20-30pts.' },
    ],
  };
}

function detectSubscriptionBurden(monthly: MonthlyData[]): RedFlag | null {
  const avgIncome = mean(monthly.map((m) => m.totalDeposits));
  const avgDiscretionary = mean(monthly.map((m) => m.discretionarySpending));
  const avgSubs = mean(monthly.map((m) => m.subscriptionCount));
  if (avgIncome === 0) return null;

  const subEstimate = avgSubs * 15;
  const subRatio = subEstimate / avgIncome;

  if (subRatio < 0.05 && avgSubs <= 5) return null;

  const severity: FlagSeverity = subRatio > 0.15 || avgSubs > 12 ? 'red' : subRatio > 0.08 || avgSubs > 8 ? 'yellow' : 'green';

  return {
    id: 'subscription_burden',
    severity,
    title: `Subscriptions consuming ~${(subRatio * 100).toFixed(0)}% of monthly income`,
    detail: `You have approximately ${Math.round(avgSubs)} active subscriptions costing an estimated ${$(subEstimate)}/month. That's ${(subRatio * 100).toFixed(0)}% of your ${$(avgIncome)}/mo income going to recurring discretionary charges.`,
    metric: `${Math.round(avgSubs)} subs | ~${$(subEstimate)}/mo | ${(subRatio * 100).toFixed(0)}% of income`,
    lenderPerspective: 'Lenders see fixed recurring obligations as "committed spend" that reduces your disposable income. High subscription load shrinks your effective debt capacity.',
    fixes: [
      { period: '30 days', action: `Audit and cancel your bottom ${Math.max(1, Math.round(avgSubs * 0.3))} least-used subscriptions. Check the Optimize Spend page for specific targets.`, impact: `Frees up ~${$(subEstimate * 0.3)}/mo immediately.` },
      { period: '3 months', action: 'Consolidate streaming services — rotate one at a time instead of running all simultaneously.', impact: 'Can cut subscription spending by 40-60%.' },
      { period: '6 months', action: 'Set a "subscription budget" of 5% of income and stick to it. Review quarterly.', impact: 'Permanently removes this flag from your profile.' },
    ],
  };
}

function detectMinimumOnlyDebtPayments(monthly: MonthlyData[], transactions: TransactionData[]): RedFlag | null {
  const debtTxs = transactions.filter((t) => t.vividCategory === 'debt_payment' && !t.isIncomeDeposit);
  if (debtTxs.length < 3) return null;

  const amounts = debtTxs.map((t) => Math.abs(t.amount)).sort((a, b) => a - b);
  const median = amounts[Math.floor(amounts.length / 2)];
  const minPayments = amounts.filter((a) => a <= median * 1.05).length;
  const minRatio = minPayments / amounts.length;

  if (minRatio < 0.7) return null;

  const severity: FlagSeverity = minRatio > 0.9 ? 'red' : 'yellow';

  return {
    id: 'minimum_only_payments',
    severity,
    title: 'Credit card/loan payments trending minimum-only',
    detail: `${(minRatio * 100).toFixed(0)}% of your debt payments are at or near the same amount — a pattern that signals you're only paying the minimum. This is one of the strongest negative signals lenders look for.`,
    metric: `${Math.round(minRatio * 100)}% minimum-pattern | Median payment: ${$(median)}`,
    lenderPerspective: 'Minimum-only payments tell lenders you\'re maxed out. It\'s the #1 predictor of future delinquency and can drop your internal risk score by 30-40%.',
    fixes: [
      { period: '30 days', action: `Add just ${$(Math.max(25, Math.round(median * 0.2)))} extra to your largest debt payment this month. Even small amounts above minimum signal intent.`, impact: 'Breaks the "minimum-only" pattern immediately.' },
      { period: '3 months', action: 'Use the debt avalanche method: pay minimum on all debts, throw every extra dollar at the highest-interest one.', impact: 'Shows accelerating payoff trajectory — a strong positive signal.' },
      { period: '6 months', action: 'Target paying off at least one debt account entirely. A closed-paid account is a powerful signal.', impact: 'Can improve your debt trajectory score by 15-25pts.' },
      { period: '1 year', action: 'Aim to have all revolving debt payments at 2x minimum or higher.', impact: 'Eliminates this red flag entirely. Lenders see you as a "transactor" not a "revolver."' },
    ],
  };
}

function detectLowEmergencyFund(monthly: MonthlyData[]): RedFlag | null {
  const avgExpenses = mean(monthly.map((m) => m.totalSpending));
  const latestBalance = monthly[monthly.length - 1]?.endBalance ?? 0;
  if (avgExpenses === 0) return null;

  const monthsCovered = Math.max(0, latestBalance) / avgExpenses;

  if (monthsCovered >= 3) return null;

  const severity: FlagSeverity = monthsCovered < 1 ? 'red' : monthsCovered < 2 ? 'yellow' : 'green';

  return {
    id: 'low_emergency_fund',
    severity,
    title: `Emergency fund below ${monthsCovered < 1 ? '1 month' : `${monthsCovered.toFixed(1)} months`}`,
    detail: `Your lowest-point balance covers only ${monthsCovered.toFixed(1)} months of expenses (${$(latestBalance)} balance ÷ ${$(avgExpenses)}/mo spending). The standard benchmark is 3-6 months.`,
    metric: `${monthsCovered.toFixed(1)} months coverage | Balance: ${$(latestBalance)}`,
    lenderPerspective: 'Banks check your average balance relative to your monthly outflow. Below 2 months of coverage signals you\'re "one emergency away" from missed payments.',
    fixes: [
      { period: '30 days', action: `Set up an automatic weekly transfer of ${$(Math.round(avgExpenses * 0.05))} to a separate savings account. Start small but start now.`, impact: 'Establishes the savings habit and moves the needle immediately.' },
      { period: '3 months', action: `Target reaching ${$(Math.round(avgExpenses * 1))} in your emergency fund (1 month of expenses).`, impact: 'Crosses the critical 1-month threshold that removes the "red" severity.' },
      { period: '6 months', action: `Grow to ${$(Math.round(avgExpenses * 2))} (2 months). Consider a high-yield savings account for the buffer.`, impact: 'Reaches "yellow" to "green" territory. Lenders see adequate reserves.' },
      { period: '1 year', action: `Target ${$(Math.round(avgExpenses * 3))} (3 months). This is the gold standard.`, impact: 'Fully eliminates this flag. Your financial resilience score jumps 20-30pts.' },
    ],
  };
}

function detectDTIWorsening(monthly: MonthlyData[]): RedFlag | null {
  if (monthly.length < 4) return null;

  const monthlyDTI = monthly.map((d) => d.totalDeposits === 0 ? 1 : d.debtPayments / d.totalDeposits);
  const avgDTI = mean(monthlyDTI);
  const slope = linearRegressionSlope(monthlyDTI);

  if (slope <= 0.001 && avgDTI < 0.35) return null;

  const monthsUntilCritical = slope > 0 && avgDTI < 0.43 ? Math.ceil((0.43 - avgDTI) / slope) : 0;

  const severity: FlagSeverity = avgDTI > 0.43 ? 'red' : slope > 0.005 || monthsUntilCritical < 6 ? 'red' : slope > 0.002 ? 'yellow' : 'yellow';

  const title = avgDTI > 0.43
    ? `Debt-to-income already critical at ${pct(avgDTI)}`
    : `Debt-to-income projected to worsen${monthsUntilCritical > 0 ? ` in ${monthsUntilCritical} months` : ''}`;

  return {
    id: 'dti_worsening',
    severity,
    title,
    detail: `Your DTI is currently ${pct(avgDTI)} and ${slope > 0.001 ? `rising ${(slope * 100).toFixed(2)}% per month` : 'at an elevated level'}. The critical threshold that tanks loan approval is 43%. ${monthsUntilCritical > 0 ? `At current trajectory, you'll hit it in ~${monthsUntilCritical} months.` : ''}`,
    metric: `DTI: ${pct(avgDTI)} | Trend: ${slope > 0 ? '+' : ''}${(slope * 100).toFixed(2)}%/mo`,
    lenderPerspective: 'DTI above 43% is the #1 automatic disqualifier for most mortgage products and a major flag for personal loans. Lenders run 6-month DTI projections internally.',
    fixes: [
      { period: '30 days', action: 'Stop taking on any new debt. Freeze credit card spending and switch to cash/debit for discretionary purchases.', impact: 'Halts the upward DTI trajectory immediately.' },
      { period: '3 months', action: `Reduce monthly debt payments by ${$(Math.round(avgDTI > 0.43 ? mean(monthly.map((m) => m.debtPayments)) * 0.2 : mean(monthly.map((m) => m.debtPayments)) * 0.1))} through payoff or consolidation at a lower rate.`, impact: 'Bends the DTI curve downward.' },
      { period: '6 months', action: 'Target getting DTI below 35%. Combine debt paydown with income growth for fastest results.', impact: 'Moves you from "denied" to "approved with conditions" territory.' },
      { period: '1 year', action: 'Aim for DTI below 28% — the "ideal" range where you get the best rates.', impact: 'Unlocks premium loan terms and lowest interest rates.' },
    ],
  };
}

function detectOverdraftHistory(monthly: MonthlyData[]): RedFlag | null {
  const totalOverdrafts = monthly.reduce((s, d) => s + d.overdraftCount, 0);
  if (totalOverdrafts === 0) return null;

  const severity: FlagSeverity = totalOverdrafts >= 3 ? 'red' : 'yellow';

  return {
    id: 'overdraft_history',
    severity,
    title: `${totalOverdrafts} overdraft event${totalOverdrafts > 1 ? 's' : ''} in your history`,
    detail: `Your account went negative ${totalOverdrafts} time${totalOverdrafts > 1 ? 's' : ''} during the analysis period. Each overdraft is recorded and visible to lenders for 7 years via ChexSystems.`,
    metric: `${totalOverdrafts} overdrafts | ${monthly.length} months analyzed`,
    lenderPerspective: 'Overdrafts signal cash flow mismanagement. Even 1-2 overdrafts in 12 months can downgrade your risk tier by 1-2 levels, costing you 0.5-2% in interest rate.',
    fixes: [
      { period: '30 days', action: 'Set up low-balance alerts at $200, $100, and $50. Link a savings account as overdraft protection.', impact: 'Prevents future overdrafts — stops the bleeding.' },
      { period: '3 months', action: 'Build a $500 checking account floor that you mentally treat as "zero."', impact: '3 clean months starts rebuilding your ChexSystems record.' },
      { period: '6 months', action: '6 months overdraft-free significantly improves how lenders view your account.', impact: 'Most lenders weight recent behavior more heavily than older incidents.' },
    ],
  };
}

function detectNoSavingsActivity(monthly: MonthlyData[]): RedFlag | null {
  const hasSavings = monthly.some((m) => m.savingsTransfers > 0);
  if (hasSavings) return null;

  return {
    id: 'no_savings',
    severity: 'yellow',
    title: 'No savings transfers detected',
    detail: 'Across your entire transaction history, there are zero transfers to savings accounts. Lenders look for active savings behavior as a sign of financial discipline.',
    metric: '0 savings transfers found',
    lenderPerspective: 'Active savers are 3x less likely to default. Lenders check for savings patterns in your bank statements. No savings = higher risk tier.',
    fixes: [
      { period: '30 days', action: 'Set up a $25/week automatic transfer to a savings account. Even $100/month matters.', impact: 'Creates the savings signal lenders look for immediately.' },
      { period: '3 months', action: 'Build to saving 5% of income monthly. The consistency matters more than the amount.', impact: '3 months of regular saves significantly improves your spending discipline score.' },
      { period: '6 months', action: 'Target 10% savings rate. Open a high-yield savings account.', impact: 'Earns the full +20pt savings bonus on your Vivid score.' },
    ],
  };
}

function detectSingleIncomeSource(monthly: MonthlyData[]): RedFlag | null {
  const avgSources = mean(monthly.map((m) => m.incomeSourceCount));
  if (avgSources >= 1.5) return null;

  return {
    id: 'single_income',
    severity: 'yellow',
    title: 'Single income source detected',
    detail: `You average ${avgSources.toFixed(1)} income source${avgSources >= 2 ? 's' : ''}. If that one source dries up, you have zero fallback. Lenders factor income source diversity into risk models.`,
    metric: `${avgSources.toFixed(1)} avg sources`,
    lenderPerspective: 'Single-source income is fragile. Lenders assign a 10-15% risk premium to single-source earners vs. multi-source. Gig workers with 3+ sources often score better than single-employer workers.',
    fixes: [
      { period: '30 days', action: 'Identify one realistic side income opportunity — freelancing, consulting, selling items, tutoring.', impact: 'Even $200/mo from a second source shows diversification.' },
      { period: '3 months', action: 'Establish a second income stream that generates at least 10% of your primary income.', impact: 'Crosses the diversification threshold for a +5-10pt income stability bonus.' },
      { period: '6 months', action: 'Aim for 2-3 income sources. Build recurring revenue where possible.', impact: 'Full diversification bonus (+20pts) and significantly reduces your lender risk profile.' },
    ],
  };
}

function detectHighDiscretionarySpend(monthly: MonthlyData[]): RedFlag | null {
  const totalSpending = monthly.reduce((s, d) => s + d.totalSpending, 0);
  const totalDiscretionary = monthly.reduce((s, d) => s + d.discretionarySpending, 0);
  if (totalSpending === 0) return null;

  const ratio = totalDiscretionary / totalSpending;
  if (ratio < 0.45) return null;

  const severity: FlagSeverity = ratio > 0.6 ? 'red' : 'yellow';

  return {
    id: 'high_discretionary',
    severity,
    title: `${(ratio * 100).toFixed(0)}% of spending is discretionary`,
    detail: `Only ${((1 - ratio) * 100).toFixed(0)}% of your spending goes to essentials (rent, food, medical, utilities). The rest is dining out, entertainment, shopping, and other non-essentials. Lenders want to see at least 55% going to essentials.`,
    metric: `${(ratio * 100).toFixed(0)}% discretionary | ${$((totalDiscretionary / monthly.length))}/mo`,
    lenderPerspective: 'High discretionary spending tells lenders you could cut back but choose not to — they question whether you\'d prioritize loan payments if things get tight.',
    fixes: [
      { period: '30 days', action: 'Track every discretionary purchase this month. Awareness alone typically cuts spending 10-15%.', impact: 'Immediate spending awareness shift.' },
      { period: '3 months', action: 'Implement the 50/30/20 rule: 50% needs, 30% wants, 20% savings/debt.', impact: 'Brings discretionary below 45% — removes this flag.' },
      { period: '6 months', action: 'Automate essential payments first, then allocate discretionary as a fixed "fun budget."', impact: 'Structurally prevents discretionary creep. Score improves 10-20pts.' },
    ],
  };
}

function detectNoPayrollPresence(monthly: MonthlyData[]): RedFlag | null {
  const hasPayroll = monthly.some((m) => m.hasPayrollDeposit);
  if (hasPayroll) return null;

  const avgIncome = mean(monthly.map((m) => m.totalDeposits));
  if (avgIncome === 0) return null;

  return {
    id: 'no_payroll',
    severity: 'yellow',
    title: 'No payroll/salary deposits detected',
    detail: 'Your income comes entirely from non-payroll sources (transfers, Venmo, irregular deposits). Lenders heavily weight W-2/payroll income over other types.',
    metric: '0 payroll deposits detected',
    lenderPerspective: 'Payroll deposits are the gold standard for income verification. Without them, lenders may require additional documentation (tax returns, 1099s) and assign higher risk.',
    fixes: [
      { period: '30 days', action: 'If you have a W-2 job, ensure your direct deposit goes to the account Vivid monitors.', impact: 'Instant fix if you have payroll but it\'s going elsewhere.' },
      { period: '3 months', action: 'For freelancers: invoice clients on a regular schedule and label transfers clearly.', impact: 'Regular deposits mimic payroll patterns, improving your stability score.' },
      { period: '6 months', action: 'Consider setting up an S-Corp or LLC that pays you a regular "salary" via payroll service.', impact: 'Converts freelance income to payroll. Earns the +15pt regularity bonus.' },
    ],
  };
}

function detectSpendingTrendWorsening(monthly: MonthlyData[]): RedFlag | null {
  if (monthly.length < 4) return null;

  const spending = monthly.map((m) => m.totalSpending);
  const slope = linearRegressionSlope(spending);
  const avgSpending = mean(spending);

  if (avgSpending === 0) return null;
  const normalizedSlope = slope / avgSpending;

  if (normalizedSlope < 0.02) return null;

  const severity: FlagSeverity = normalizedSlope > 0.05 ? 'red' : 'yellow';

  return {
    id: 'spending_trend',
    severity,
    title: `Spending increasing ${(normalizedSlope * 100).toFixed(1)}% per month`,
    detail: `Your spending is growing by ~${$(slope)}/month. Over the analysis period, monthly spending has risen from ~${$(spending[0])} to ~${$(spending[spending.length - 1])}. This is "lifestyle creep" in action.`,
    metric: `+${$(slope)}/mo growth | ${(normalizedSlope * 100).toFixed(1)}% monthly increase`,
    lenderPerspective: 'Accelerating spending signals lifestyle inflation. Lenders project this forward — if your expenses are growing faster than income, your debt capacity shrinks over time.',
    fixes: [
      { period: '30 days', action: 'Identify the 3 categories where spending grew most. Set hard monthly limits for each.', impact: 'Stops the upward trend in the biggest offenders.' },
      { period: '3 months', action: 'Freeze your spending at last month\'s level. Any category that exceeds gets cut the following month.', impact: 'Flattens the spending curve — removes this flag.' },
      { period: '6 months', action: 'Build a system where any income increase gets split: 50% to savings/debt, 50% to lifestyle.', impact: 'Prevents future lifestyle creep permanently.' },
    ],
  };
}

// ---------------------------------------------------------------------------
// Main report generator
// ---------------------------------------------------------------------------

export function generateRedFlagsReport(
  monthlyData: MonthlyData[],
  transactions: TransactionData[],
): RedFlagsReport {
  const detectors = [
    detectIncomeVolatility,
    detectMinimumOnlyDebtPayments,
    detectDTIWorsening,
    detectLowEmergencyFund,
    detectOverdraftHistory,
    detectSubscriptionBurden,
    detectHighDiscretionarySpend,
    detectNoSavingsActivity,
    detectSingleIncomeSource,
    detectNoPayrollPresence,
    detectSpendingTrendWorsening,
  ];

  const allFlags: RedFlag[] = [];

  for (const detect of detectors) {
    const flag = detect(monthlyData, transactions);
    if (flag) allFlags.push(flag);
  }

  // Sort: red first, then yellow, then green
  const order: Record<FlagSeverity, number> = { red: 0, yellow: 1, green: 2 };
  allFlags.sort((a, b) => order[a.severity] - order[b.severity]);

  const redCount = allFlags.filter((f) => f.severity === 'red').length;
  const yellowCount = allFlags.filter((f) => f.severity === 'yellow').length;
  const greenCount = allFlags.filter((f) => f.severity === 'green').length;

  let verdict: string;
  if (redCount === 0 && yellowCount <= 1) {
    verdict = 'Strong position — you have very few flags that would concern a lender. Focus on maintaining your current habits.';
  } else if (redCount === 0 && yellowCount <= 3) {
    verdict = 'Decent position with room to improve. Address the yellow flags over the next 3-6 months and you\'ll be in strong shape for a loan application.';
  } else if (redCount <= 1) {
    verdict = 'Some concerns that lenders will notice. The red flag should be your top priority — fix it before applying for any loan.';
  } else if (redCount <= 3) {
    verdict = 'Multiple serious flags. A loan application right now would likely face tough scrutiny or denial. Focus on the red items first — most can be meaningfully improved in 3-6 months.';
  } else {
    verdict = 'Significant work needed before applying for a loan. The good news: every flag has a clear fix path. Start with the top 3 red flags and work down the list.';
  }

  const summary = allFlags.length === 0
    ? 'No red flags detected. Your financial profile looks clean from a lender\'s perspective.'
    : `${allFlags.length} thing${allFlags.length > 1 ? 's' : ''} that could hurt your loan approval`;

  return {
    flags: allFlags,
    redCount,
    yellowCount,
    greenCount,
    summary,
    loanReadinessVerdict: verdict,
  };
}
