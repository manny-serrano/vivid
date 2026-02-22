// ---------------------------------------------------------------------------
// Vivid – Anomaly Detection (Lifestyle Creep, Subscription Bloat, etc.)
// ---------------------------------------------------------------------------

import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { mean, linearRegressionSlope } from './scoreCalculator.js';
import type { MonthlyData } from './scoreCalculator.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AnomalyType =
  | 'lifestyle_creep'
  | 'subscription_bloat'
  | 'income_volatility'
  | 'spending_spike'
  | 'savings_decline'
  | 'recurring_increase'
  | 'discretionary_surge'
  | 'balance_erosion';

export type Severity = 'info' | 'warning' | 'alert';

export interface Anomaly {
  type: AnomalyType;
  severity: Severity;
  title: string;
  description: string;
  metric: string;
  currentValue: string;
  trend: string;
  actionableAdvice: string;
}

export interface TransactionForAnomaly {
  amount: number;
  date: string;
  merchantName: string | null;
  name: string;
  vividCategory: string;
  isRecurring: boolean;
  isIncomeDeposit: boolean;
}

export interface AnomalyReport {
  anomalies: Anomaly[];
  healthScore: number;
  summary: string;
  aiInsights: string | null;
}

// ---------------------------------------------------------------------------
// Detection engine
// ---------------------------------------------------------------------------

export async function detectAnomalies(
  monthlyData: MonthlyData[],
  transactions: TransactionForAnomaly[],
): Promise<AnomalyReport> {
  const anomalies: Anomaly[] = [];

  if (monthlyData.length >= 3) {
    detectLifestyleCreep(monthlyData, anomalies);
    detectSpendingSpikes(monthlyData, anomalies);
    detectSavingsDecline(monthlyData, anomalies);
    detectBalanceErosion(monthlyData, anomalies);
    detectIncomeVolatility(monthlyData, anomalies);
    detectDiscretionarySurge(monthlyData, anomalies);
  }

  detectSubscriptionBloat(monthlyData, transactions, anomalies);
  detectRecurringIncrease(transactions, anomalies);

  anomalies.sort((a, b) => severityRank(b.severity) - severityRank(a.severity));

  const healthScore = computeHealthScore(anomalies);
  const summary = buildSummary(anomalies, healthScore);
  const aiInsights = await generateAiInsights(anomalies, monthlyData);

  return { anomalies, healthScore, summary, aiInsights };
}

// ---------------------------------------------------------------------------
// Individual detectors
// ---------------------------------------------------------------------------

function detectLifestyleCreep(monthlyData: MonthlyData[], out: Anomaly[]): void {
  if (monthlyData.length < 4) return;

  const discretionary = monthlyData.map((m) => m.discretionarySpending);
  const slope = linearRegressionSlope(discretionary);
  const avgDisc = mean(discretionary);

  if (avgDisc === 0) return;
  const growthRate = slope / avgDisc;

  if (growthRate > 0.03) {
    const mid = Math.floor(monthlyData.length / 2);
    const firstHalf = mean(discretionary.slice(0, mid));
    const secondHalf = mean(discretionary.slice(mid));
    const pctIncrease = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf * 100) : 0;

    out.push({
      type: 'lifestyle_creep',
      severity: growthRate > 0.06 ? 'alert' : 'warning',
      title: 'Lifestyle Creep Detected',
      description: `Your discretionary spending has been trending upward over the past ${monthlyData.length} months. This gradual increase often goes unnoticed but compounds over time.`,
      metric: 'Discretionary Spending Trend',
      currentValue: `$${Math.round(secondHalf).toLocaleString()}/mo avg (recent)`,
      trend: `+${pctIncrease.toFixed(1)}% increase from earlier period`,
      actionableAdvice: 'Set a monthly discretionary budget and review it weekly. Consider the "24-hour rule" — wait a day before non-essential purchases over $50.',
    });
  }
}

function detectSubscriptionBloat(
  monthlyData: MonthlyData[],
  transactions: TransactionForAnomaly[],
  out: Anomaly[],
): void {
  const recurring = transactions.filter((t) => t.isRecurring && !t.isIncomeDeposit);
  const uniqueSubs = new Map<string, number>();

  for (const t of recurring) {
    const key = (t.merchantName ?? t.name).toLowerCase();
    uniqueSubs.set(key, (uniqueSubs.get(key) ?? 0) + Math.abs(t.amount));
  }

  const subCount = uniqueSubs.size;
  const monthsOfData = monthlyData.length || 1;
  const monthlySubCost = [...uniqueSubs.values()].reduce((s, v) => s + v, 0) / monthsOfData;
  const avgIncome = mean(monthlyData.map((m) => m.totalDeposits));
  const subIncomeRatio = avgIncome > 0 ? monthlySubCost / avgIncome : 0;

  if (subCount >= 8 || subIncomeRatio > 0.1) {
    const topSubs = [...uniqueSubs.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, total]) => `${name}: $${Math.round(total / monthsOfData)}/mo`)
      .join(', ');

    out.push({
      type: 'subscription_bloat',
      severity: subCount >= 12 || subIncomeRatio > 0.15 ? 'alert' : 'warning',
      title: 'Subscription Bloat',
      description: `You have ${subCount} recurring charges totaling ~$${Math.round(monthlySubCost)}/month (${(subIncomeRatio * 100).toFixed(1)}% of income).`,
      metric: 'Recurring Subscriptions',
      currentValue: `${subCount} active subscriptions, ~$${Math.round(monthlySubCost)}/mo`,
      trend: `Top: ${topSubs}`,
      actionableAdvice: 'Audit every subscription. Cancel anything you haven\'t used in 30 days. Consider consolidating streaming services or sharing family plans.',
    });
  } else if (subCount >= 5) {
    out.push({
      type: 'subscription_bloat',
      severity: 'info',
      title: 'Subscription Check-In',
      description: `You have ${subCount} recurring charges (~$${Math.round(monthlySubCost)}/month). Not excessive, but worth a quarterly review.`,
      metric: 'Recurring Subscriptions',
      currentValue: `${subCount} subscriptions, ~$${Math.round(monthlySubCost)}/mo`,
      trend: 'Within normal range',
      actionableAdvice: 'Do a quarterly subscription audit — set a calendar reminder to review what you\'re actually using.',
    });
  }
}

function detectSpendingSpikes(monthlyData: MonthlyData[], out: Anomaly[]): void {
  const spending = monthlyData.map((m) => m.totalSpending);
  const avg = mean(spending);
  if (avg === 0) return;

  const recentMonths = monthlyData.slice(-3);
  for (const m of recentMonths) {
    const ratio = m.totalSpending / avg;
    if (ratio > 1.5) {
      out.push({
        type: 'spending_spike',
        severity: ratio > 2.0 ? 'alert' : 'warning',
        title: `Spending Spike in ${m.month}`,
        description: `Spending in ${m.month} was $${Math.round(m.totalSpending).toLocaleString()} — ${Math.round((ratio - 1) * 100)}% above your average of $${Math.round(avg).toLocaleString()}.`,
        metric: 'Monthly Total Spending',
        currentValue: `$${Math.round(m.totalSpending).toLocaleString()}`,
        trend: `${Math.round((ratio - 1) * 100)}% above average`,
        actionableAdvice: 'Review this month\'s transactions for one-time vs. recurring charges. If it\'s a one-time expense, ensure you have a recovery plan for the next 2 months.',
      });
    }
  }
}

function detectSavingsDecline(monthlyData: MonthlyData[], out: Anomaly[]): void {
  const surpluses = monthlyData.map((m) => m.totalDeposits - m.totalSpending);
  const slope = linearRegressionSlope(surpluses);
  const avgSurplus = mean(surpluses);

  if (slope < -50 && avgSurplus > 0) {
    out.push({
      type: 'savings_decline',
      severity: slope < -150 ? 'alert' : 'warning',
      title: 'Savings Rate Declining',
      description: 'Your monthly surplus (income minus spending) has been shrinking over time. If this trend continues, you could slip into deficit.',
      metric: 'Monthly Surplus Trend',
      currentValue: `$${Math.round(surpluses[surpluses.length - 1]).toLocaleString()} (latest month)`,
      trend: `Declining by ~$${Math.round(Math.abs(slope))}/month`,
      actionableAdvice: 'Automate a fixed savings transfer at the start of each month before discretionary spending. "Pay yourself first" reverses this trend.',
    });
  } else if (avgSurplus < 0) {
    out.push({
      type: 'savings_decline',
      severity: 'alert',
      title: 'Spending Exceeds Income',
      description: `On average, you're spending $${Math.round(Math.abs(avgSurplus)).toLocaleString()} more than you earn each month. This is unsustainable long-term.`,
      metric: 'Average Monthly Surplus',
      currentValue: `-$${Math.round(Math.abs(avgSurplus)).toLocaleString()}/mo`,
      trend: 'Negative surplus',
      actionableAdvice: 'This is the most critical issue to address. Identify your top 3 discretionary expenses and cut or reduce them. Even getting to break-even is a huge win.',
    });
  }
}

function detectBalanceErosion(monthlyData: MonthlyData[], out: Anomaly[]): void {
  const balances = monthlyData.map((m) => m.endBalance);
  if (balances.length < 3) return;

  const slope = linearRegressionSlope(balances);
  const avgBalance = mean(balances);

  if (slope < -100 && avgBalance > 0) {
    out.push({
      type: 'balance_erosion',
      severity: slope < -300 ? 'alert' : 'warning',
      title: 'Balance Erosion',
      description: 'Your account balance has been trending downward. At this rate, your financial buffer is shrinking.',
      metric: 'End-of-Month Balance Trend',
      currentValue: `$${Math.round(balances[balances.length - 1]).toLocaleString()}`,
      trend: `Declining by ~$${Math.round(Math.abs(slope))}/month`,
      actionableAdvice: 'Investigate what\'s driving the decline — is it growing expenses, declining income, or both? Knowing the cause is the first step to reversing it.',
    });
  }
}

function detectIncomeVolatility(monthlyData: MonthlyData[], out: Anomaly[]): void {
  const incomes = monthlyData.map((m) => m.totalDeposits);
  const avg = mean(incomes);
  if (avg === 0) return;

  let sumSq = 0;
  for (const v of incomes) sumSq += (v - avg) ** 2;
  const cv = Math.sqrt(sumSq / incomes.length) / avg;

  if (cv > 0.35) {
    out.push({
      type: 'income_volatility',
      severity: cv > 0.5 ? 'alert' : 'warning',
      title: 'High Income Volatility',
      description: `Your monthly income varies significantly (coefficient of variation: ${(cv * 100).toFixed(0)}%). This makes budgeting harder and increases financial risk.`,
      metric: 'Income Coefficient of Variation',
      currentValue: `${(cv * 100).toFixed(0)}% variability`,
      trend: 'Highly variable income pattern',
      actionableAdvice: 'Budget based on your lowest income month, not your average. Build a "buffer account" equal to 2x the difference between your high and low months.',
    });
  }
}

function detectDiscretionarySurge(monthlyData: MonthlyData[], out: Anomaly[]): void {
  if (monthlyData.length < 4) return;

  const ratios = monthlyData.map((m) =>
    m.totalSpending > 0 ? m.discretionarySpending / m.totalSpending : 0,
  );

  const recentAvg = mean(ratios.slice(-3));
  const earlierAvg = mean(ratios.slice(0, -3));

  if (recentAvg > earlierAvg + 0.1 && recentAvg > 0.45) {
    out.push({
      type: 'discretionary_surge',
      severity: recentAvg > 0.6 ? 'alert' : 'warning',
      title: 'Discretionary Spending Surge',
      description: `Discretionary spending now makes up ${(recentAvg * 100).toFixed(0)}% of total spending, up from ${(earlierAvg * 100).toFixed(0)}% earlier. The 50/30/20 guideline suggests keeping wants at 30%.`,
      metric: 'Discretionary-to-Total Ratio',
      currentValue: `${(recentAvg * 100).toFixed(0)}% (recent 3 months)`,
      trend: `Up from ${(earlierAvg * 100).toFixed(0)}%`,
      actionableAdvice: 'Categorize your discretionary spending into "high-joy" and "low-joy" items. Cut the low-joy items first — you won\'t miss them.',
    });
  }
}

function detectRecurringIncrease(transactions: TransactionForAnomaly[], out: Anomaly[]): void {
  const recurring = transactions.filter((t) => t.isRecurring && !t.isIncomeDeposit);
  const byMerchant = new Map<string, { amounts: number[]; dates: string[] }>();

  for (const t of recurring) {
    const key = (t.merchantName ?? t.name).toLowerCase();
    const entry = byMerchant.get(key) ?? { amounts: [], dates: [] };
    entry.amounts.push(Math.abs(t.amount));
    entry.dates.push(t.date);
    byMerchant.set(key, entry);
  }

  for (const [merchant, data] of byMerchant) {
    if (data.amounts.length < 3) continue;
    const sorted = data.amounts.sort((a, b) => a - b);
    const earliest = sorted[0];
    const latest = sorted[sorted.length - 1];

    if (earliest > 0 && (latest - earliest) / earliest > 0.2) {
      out.push({
        type: 'recurring_increase',
        severity: 'info',
        title: `Price Increase: ${merchant}`,
        description: `${merchant} charges have increased from $${earliest.toFixed(2)} to $${latest.toFixed(2)} — a ${((latest - earliest) / earliest * 100).toFixed(0)}% increase.`,
        metric: 'Recurring Charge Amount',
        currentValue: `$${latest.toFixed(2)}/charge`,
        trend: `Up from $${earliest.toFixed(2)}`,
        actionableAdvice: 'Review if this service is still worth the increased price. Look for alternatives or consider negotiating.',
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Scoring & summary
// ---------------------------------------------------------------------------

function severityRank(s: Severity): number {
  return s === 'alert' ? 3 : s === 'warning' ? 2 : 1;
}

function computeHealthScore(anomalies: Anomaly[]): number {
  let score = 100;
  for (const a of anomalies) {
    if (a.severity === 'alert') score -= 15;
    else if (a.severity === 'warning') score -= 8;
    else score -= 3;
  }
  return Math.max(0, Math.min(100, score));
}

function buildSummary(anomalies: Anomaly[], healthScore: number): string {
  const alerts = anomalies.filter((a) => a.severity === 'alert').length;
  const warnings = anomalies.filter((a) => a.severity === 'warning').length;
  const infos = anomalies.filter((a) => a.severity === 'info').length;

  if (anomalies.length === 0) {
    return 'No anomalies detected. Your financial patterns look healthy and consistent. Keep up the great work!';
  }

  const parts: string[] = [];
  if (alerts > 0) parts.push(`${alerts} alert${alerts > 1 ? 's' : ''}`);
  if (warnings > 0) parts.push(`${warnings} warning${warnings > 1 ? 's' : ''}`);
  if (infos > 0) parts.push(`${infos} insight${infos > 1 ? 's' : ''}`);

  return `Found ${parts.join(', ')} across your financial patterns. Health score: ${healthScore}/100. ${
    alerts > 0 ? 'Address the alerts first — they have the biggest impact on your financial resilience.' : 'No critical issues, but the warnings are worth reviewing.'
  }`;
}

// ---------------------------------------------------------------------------
// AI-powered insights (with graceful fallback)
// ---------------------------------------------------------------------------

async function generateAiInsights(
  anomalies: Anomaly[],
  monthlyData: MonthlyData[],
): Promise<string | null> {
  if (anomalies.length === 0) return null;

  try {
    const { VertexAI } = await import('@google-cloud/vertexai');
    const vertexAI = new VertexAI({ project: env.GCP_PROJECT_ID, location: env.VERTEX_AI_LOCATION });
    const model = vertexAI.getGenerativeModel({
      model: env.VERTEX_AI_MODEL,
      generationConfig: { temperature: 0.7, topP: 0.9, maxOutputTokens: 1024 },
      systemInstruction: `You are a financial behavior analyst for Vivid. Given detected anomalies in a user's spending patterns, write a warm, actionable analysis (2-4 paragraphs). Frame issues as opportunities. Be specific and avoid generic platitudes. Don't output JSON or code.`,
    });

    const anomalySummary = anomalies
      .map((a) => `[${a.severity.toUpperCase()}] ${a.title}: ${a.description}`)
      .join('\n');

    const avgIncome = mean(monthlyData.map((m) => m.totalDeposits));
    const avgSpending = mean(monthlyData.map((m) => m.totalSpending));

    const prompt = `DETECTED ANOMALIES:
${anomalySummary}

FINANCIAL CONTEXT:
- Average Monthly Income: $${Math.round(avgIncome).toLocaleString()}
- Average Monthly Spending: $${Math.round(avgSpending).toLocaleString()}
- Months Analyzed: ${monthlyData.length}

Write a personalized, actionable insight summary that connects the dots between these anomalies and gives the user a clear 3-step action plan.`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    return result.response.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  } catch (err) {
    logger.warn('[anomaly] Vertex AI unavailable, skipping AI insights', {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
