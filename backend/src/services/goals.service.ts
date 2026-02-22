import { prisma } from '../config/database.js';
import type { Goal, Milestone, GoalCategory, GoalStatus } from '@prisma/client';

export interface CreateGoalInput {
  userId: string;
  title: string;
  description?: string;
  category: GoalCategory;
  targetValue: number;
  currentValue?: number;
  unit?: string;
  targetDate: string;
}

export interface UpdateGoalInput {
  title?: string;
  description?: string;
  currentValue?: number;
  targetDate?: string;
  status?: GoalStatus;
}

export type GoalWithMilestones = Goal & { milestones: Milestone[] };

export async function createGoal(input: CreateGoalInput): Promise<GoalWithMilestones> {
  const milestones = generateMilestones(input.title, input.category, input.targetValue, input.currentValue ?? 0);

  const goal = await prisma.goal.create({
    data: {
      userId: input.userId,
      title: input.title,
      description: input.description,
      category: input.category,
      targetValue: input.targetValue,
      currentValue: input.currentValue ?? 0,
      unit: input.unit ?? 'dollars',
      targetDate: new Date(input.targetDate),
      milestones: {
        create: milestones.map((m, i) => ({
          title: m.title,
          targetValue: m.targetValue,
          sortOrder: i,
        })),
      },
    },
    include: { milestones: { orderBy: { sortOrder: 'asc' } } },
  });

  return goal;
}

export async function getUserGoals(userId: string): Promise<GoalWithMilestones[]> {
  return prisma.goal.findMany({
    where: { userId },
    include: { milestones: { orderBy: { sortOrder: 'asc' } } },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  });
}

export async function getGoalById(goalId: string, userId: string): Promise<GoalWithMilestones | null> {
  return prisma.goal.findFirst({
    where: { id: goalId, userId },
    include: { milestones: { orderBy: { sortOrder: 'asc' } } },
  });
}

export async function updateGoal(goalId: string, userId: string, input: UpdateGoalInput): Promise<GoalWithMilestones> {
  const existing = await prisma.goal.findFirst({ where: { id: goalId, userId } });
  if (!existing) throw new Error('Goal not found');

  const newCurrentValue = input.currentValue ?? existing.currentValue;
  const isCompleted = newCurrentValue >= existing.targetValue && existing.status === 'ACTIVE';

  const goal = await prisma.goal.update({
    where: { id: goalId },
    data: {
      ...(input.title && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.currentValue !== undefined && { currentValue: input.currentValue }),
      ...(input.targetDate && { targetDate: new Date(input.targetDate) }),
      ...(input.status && { status: input.status }),
      ...(isCompleted && { status: 'COMPLETED', completedAt: new Date() }),
    },
    include: { milestones: { orderBy: { sortOrder: 'asc' } } },
  });

  if (input.currentValue !== undefined) {
    await updateMilestoneProgress(goalId, newCurrentValue);
  }

  return prisma.goal.findUniqueOrThrow({
    where: { id: goalId },
    include: { milestones: { orderBy: { sortOrder: 'asc' } } },
  });
}

export async function deleteGoal(goalId: string, userId: string): Promise<void> {
  const existing = await prisma.goal.findFirst({ where: { id: goalId, userId } });
  if (!existing) throw new Error('Goal not found');
  await prisma.goal.delete({ where: { id: goalId } });
}

export async function autoProgressGoals(userId: string): Promise<GoalWithMilestones[]> {
  const twin = await prisma.twin.findUnique({
    where: { userId },
    include: { transactions: true },
  });
  if (!twin) return getUserGoals(userId);

  const goals = await prisma.goal.findMany({
    where: { userId, status: 'ACTIVE' },
    include: { milestones: { orderBy: { sortOrder: 'asc' } } },
  });

  for (const goal of goals) {
    const autoValue = computeAutoProgress(goal, twin);
    if (autoValue !== null && autoValue !== goal.currentValue) {
      await prisma.goal.update({
        where: { id: goal.id },
        data: {
          currentValue: autoValue,
          ...(autoValue >= goal.targetValue && { status: 'COMPLETED', completedAt: new Date() }),
        },
      });
      await updateMilestoneProgress(goal.id, autoValue);
    }
  }

  return getUserGoals(userId);
}

export interface GoalStats {
  total: number;
  active: number;
  completed: number;
  avgProgress: number;
  streak: number;
  topCategory: string;
}

export async function getGoalStats(userId: string): Promise<GoalStats> {
  const goals = await prisma.goal.findMany({ where: { userId } });
  const active = goals.filter((g) => g.status === 'ACTIVE');
  const completed = goals.filter((g) => g.status === 'COMPLETED');
  const avgProgress = active.length > 0
    ? active.reduce((sum, g) => sum + Math.min(100, (g.currentValue / g.targetValue) * 100), 0) / active.length
    : 0;

  const categories = goals.map((g) => g.category);
  const freq: Record<string, number> = {};
  for (const c of categories) freq[c] = (freq[c] || 0) + 1;
  const topCategory = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'SAVINGS';

  const sortedCompleted = completed
    .filter((g) => g.completedAt)
    .sort((a, b) => (b.completedAt!.getTime()) - (a.completedAt!.getTime()));

  let streak = 0;
  const now = new Date();
  for (const g of sortedCompleted) {
    const daysDiff = (now.getTime() - g.completedAt!.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff < 90) streak++;
    else break;
  }

  return {
    total: goals.length,
    active: active.length,
    completed: completed.length,
    avgProgress: Math.round(avgProgress),
    streak,
    topCategory,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateMilestones(
  title: string,
  category: GoalCategory,
  targetValue: number,
  currentValue: number,
): { title: string; targetValue: number }[] {
  const range = targetValue - currentValue;
  if (range <= 0) return [];

  const steps = [0.25, 0.5, 0.75, 1.0];
  const labels: Record<number, string> = {
    0.25: '25% — Getting started',
    0.5: '50% — Halfway there',
    0.75: '75% — Almost there',
    1.0: '100% — Goal reached!',
  };

  return steps.map((pct) => ({
    title: labels[pct],
    targetValue: Math.round(currentValue + range * pct),
  }));
}

async function updateMilestoneProgress(goalId: string, currentValue: number): Promise<void> {
  const milestones = await prisma.milestone.findMany({
    where: { goalId },
    orderBy: { sortOrder: 'asc' },
  });

  for (const m of milestones) {
    const shouldBeReached = currentValue >= m.targetValue;
    if (shouldBeReached !== m.reached) {
      await prisma.milestone.update({
        where: { id: m.id },
        data: {
          reached: shouldBeReached,
          reachedAt: shouldBeReached ? new Date() : null,
        },
      });
    }
  }
}

function computeAutoProgress(
  goal: GoalWithMilestones,
  twin: { overallScore: number; incomeStabilityScore: number; spendingDisciplineScore: number; debtTrajectoryScore: number; financialResilienceScore: number; growthMomentumScore: number; transactions: { amount: number; vividCategory: string; isIncomeDeposit: boolean; isRecurring: boolean }[] },
): number | null {
  switch (goal.category) {
    case 'SCORE_IMPROVEMENT':
      return twin.overallScore;
    case 'MORTGAGE_READY': {
      const mortgage = (twin as Record<string, unknown>)['mortgageReadiness'] as number | undefined;
      return mortgage ?? null;
    }
    case 'SPENDING_REDUCTION': {
      const nonEssential = twin.transactions
        .filter((t) => !t.isIncomeDeposit && ['dining', 'entertainment', 'shopping', 'subscription'].some((c) => t.vividCategory.toLowerCase().includes(c)))
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      return Math.round(goal.targetValue - nonEssential);
    }
    default:
      return null;
  }
}
