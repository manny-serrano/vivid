import { prisma } from '../config/database.js';
import { createNotification } from './notification.service.js';
import { logger } from '../utils/logger.js';
import type { Twin } from '@prisma/client';

interface DetectionContext {
  userId: string;
  newTwin: Twin;
  oldTwin: Twin | null;
  transactions: { amount: number; merchantName: string | null; vividCategory: string; isIncomeDeposit: boolean; isRecurring: boolean; date: Date }[];
}

export async function runDetectors(ctx: DetectionContext): Promise<void> {
  try {
    await Promise.allSettled([
      detectScoreMilestone(ctx),
      detectScoreDrop(ctx),
      detectIncomeLate(ctx),
      detectSpendingSpike(ctx),
      detectSubscriptionChange(ctx),
      detectDtiWarning(ctx),
      detectGoalCompletions(ctx),
    ]);
  } catch (err) {
    logger.error('[notification-detector] Error running detectors', { error: err });
  }
}

async function detectScoreMilestone({ userId, newTwin, oldTwin }: DetectionContext) {
  if (!oldTwin) return;

  const milestones = [50, 60, 70, 80, 90];
  const oldScore = oldTwin.overallScore;
  const newScore = newTwin.overallScore;

  for (const m of milestones) {
    if (oldScore < m && newScore >= m) {
      await createNotification({
        userId,
        type: 'SCORE_MILESTONE',
        severity: 'SUCCESS',
        title: `Your Vivid score crossed ${m}!`,
        body: `Congratulations — your overall Vivid score just hit ${Math.round(newScore)}. That's up from ${Math.round(oldScore)}. Keep the momentum going!`,
        actionUrl: '/dashboard',
      });
      break;
    }
  }
}

async function detectScoreDrop({ userId, newTwin, oldTwin }: DetectionContext) {
  if (!oldTwin) return;

  const pillars = [
    { label: 'Income Stability', old: oldTwin.incomeStabilityScore, cur: newTwin.incomeStabilityScore },
    { label: 'Spending Discipline', old: oldTwin.spendingDisciplineScore, cur: newTwin.spendingDisciplineScore },
    { label: 'Debt Trajectory', old: oldTwin.debtTrajectoryScore, cur: newTwin.debtTrajectoryScore },
    { label: 'Financial Resilience', old: oldTwin.financialResilienceScore, cur: newTwin.financialResilienceScore },
    { label: 'Growth Momentum', old: oldTwin.growthMomentumScore, cur: newTwin.growthMomentumScore },
  ];

  for (const p of pillars) {
    const drop = p.old - p.cur;
    if (drop >= 10) {
      await createNotification({
        userId,
        type: 'SCORE_DROP',
        severity: 'WARNING',
        title: `${p.label} score dropped ${Math.round(drop)} points`,
        body: `Your ${p.label} score went from ${Math.round(p.old)} to ${Math.round(p.cur)}. Check your recent activity to understand why.`,
        actionUrl: '/twin',
      });
    }
  }
}

async function detectIncomeLate({ userId, transactions }: DetectionContext) {
  const deposits = transactions.filter((t) => t.isIncomeDeposit);
  if (deposits.length === 0) return;

  const now = new Date();
  const daysSinceLast = deposits.reduce((min, d) => {
    const diff = (now.getTime() - new Date(d.date).getTime()) / (1000 * 60 * 60 * 24);
    return diff < min ? diff : min;
  }, Infinity);

  if (daysSinceLast > 35) {
    const recent = await prisma.notification.findFirst({
      where: { userId, type: 'INCOME_LATE', createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    });
    if (recent) return;

    await createNotification({
      userId,
      type: 'INCOME_LATE',
      severity: 'CRITICAL',
      title: `Income deposit is ${Math.round(daysSinceLast - 30)} days late`,
      body: `It's been ${Math.round(daysSinceLast)} days since your last income deposit. If this continues, your Resilience score may drop. Consider checking with your employer or income source.`,
      actionUrl: '/red-flags',
    });
  }
}

async function detectSpendingSpike({ userId, transactions }: DetectionContext) {
  const nonIncome = transactions.filter((t) => !t.isIncomeDeposit);
  if (nonIncome.length < 20) return;

  const byMonth = new Map<string, number>();
  for (const t of nonIncome) {
    const month = new Date(t.date).toISOString().slice(0, 7);
    byMonth.set(month, (byMonth.get(month) ?? 0) + Math.abs(t.amount));
  }

  const months = [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  if (months.length < 3) return;

  const latest = months[months.length - 1];
  const prior = months.slice(0, -1);
  const avg = prior.reduce((s, [, v]) => s + v, 0) / prior.length;

  if (latest[1] > avg * 1.4 && latest[1] - avg > 200) {
    const pctOver = Math.round(((latest[1] / avg) - 1) * 100);
    await createNotification({
      userId,
      type: 'SPENDING_SPIKE',
      severity: 'WARNING',
      title: `Spending is ${pctOver}% above your average this month`,
      body: `You've spent $${Math.round(latest[1]).toLocaleString()} this month vs your $${Math.round(avg).toLocaleString()} average. Review your transactions to see where the spike is coming from.`,
      actionUrl: '/optimize',
    });
  }
}

async function detectSubscriptionChange({ userId, transactions }: DetectionContext) {
  const recurring = transactions.filter((t) => t.isRecurring && !t.isIncomeDeposit);
  if (recurring.length < 2) return;

  const byMerchant = new Map<string, number[]>();
  for (const t of recurring) {
    const key = (t.merchantName ?? 'unknown').toLowerCase();
    const existing = byMerchant.get(key);
    if (existing) existing.push(Math.abs(t.amount));
    else byMerchant.set(key, [Math.abs(t.amount)]);
  }

  for (const [merchant, amounts] of byMerchant) {
    if (amounts.length < 2) continue;
    const latest = amounts[amounts.length - 1];
    const previous = amounts[amounts.length - 2];
    const increase = latest - previous;

    if (increase > 1 && increase / previous > 0.15) {
      await createNotification({
        userId,
        type: 'SUBSCRIPTION_CHANGE',
        severity: 'INFO',
        title: `Price increase detected: ${merchant}`,
        body: `${merchant} went from $${previous.toFixed(2)} to $${latest.toFixed(2)} — that's a $${increase.toFixed(2)}/month increase ($${(increase * 12).toFixed(0)}/year).`,
        actionUrl: '/optimize',
      });
    }
  }
}

async function detectDtiWarning({ userId, transactions, newTwin }: DetectionContext) {
  const deposits = transactions.filter((t) => t.isIncomeDeposit);
  const debt = transactions.filter((t) => t.vividCategory === 'debt_payment');
  if (deposits.length === 0) return;

  const monthlyIncome = deposits.reduce((s, t) => s + Math.abs(t.amount), 0) / Math.max(1, new Set(deposits.map((t) => new Date(t.date).toISOString().slice(0, 7))).size);
  const monthlyDebt = debt.reduce((s, t) => s + Math.abs(t.amount), 0) / Math.max(1, new Set(debt.map((t) => new Date(t.date).toISOString().slice(0, 7))).size);

  const dti = monthlyIncome > 0 ? (monthlyDebt / monthlyIncome) * 100 : 0;

  const thresholds = [
    { pct: 50, severity: 'CRITICAL' as const, label: '50% danger zone' },
    { pct: 43, severity: 'WARNING' as const, label: '43% danger threshold' },
  ];

  for (const th of thresholds) {
    if (dti >= th.pct) {
      const recent = await prisma.notification.findFirst({
        where: { userId, type: 'DTI_WARNING', createdAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } },
      });
      if (recent) break;

      await createNotification({
        userId,
        type: 'DTI_WARNING',
        severity: th.severity,
        title: `Your debt-to-income ratio crossed ${th.pct}%`,
        body: `Your DTI is ~${Math.round(dti)}%. Lenders typically reject above 43%. You're spending $${Math.round(monthlyDebt)}/month on debt out of $${Math.round(monthlyIncome)}/month income.`,
        actionUrl: '/red-flags',
      });
      break;
    }
  }
}

async function detectGoalCompletions({ userId }: DetectionContext) {
  const recentlyCompleted = await prisma.goal.findMany({
    where: {
      userId,
      status: 'COMPLETED',
      completedAt: { gte: new Date(Date.now() - 60 * 1000) },
    },
  });

  for (const goal of recentlyCompleted) {
    const exists = await prisma.notification.findFirst({
      where: { userId, type: 'GOAL_COMPLETED', metadata: { contains: goal.id } },
    });
    if (exists) continue;

    await createNotification({
      userId,
      type: 'GOAL_COMPLETED',
      severity: 'SUCCESS',
      title: `Goal achieved: ${goal.title}`,
      body: `You hit your target of ${goal.unit === 'dollars' ? '$' : ''}${goal.targetValue.toLocaleString()}! Time to set a new one.`,
      actionUrl: '/goals',
      metadata: JSON.stringify({ goalId: goal.id }),
    });
  }
}
