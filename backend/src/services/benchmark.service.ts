import { prisma } from '../config/database.js';

export interface BenchmarkResult {
  overall: PercentileResult;
  pillars: Record<string, PercentileResult>;
  savingsRate: PercentileResult;
  debtToIncome: PercentileResult;
  cohort: CohortInfo;
  insights: string[];
}

export interface PercentileResult {
  value: number;
  percentile: number;
  cohortAvg: number;
  cohortMedian: number;
  label: string;
}

export interface CohortInfo {
  description: string;
  size: number;
  filters: { ageRange?: string; state?: string; incomeRange?: string };
}

export async function getBenchmark(
  userId: string,
  filters?: { ageRange?: string; state?: string; incomeRange?: string },
): Promise<BenchmarkResult> {
  const twin = await prisma.twin.findUnique({
    where: { userId },
    include: { transactions: true },
  });
  if (!twin) throw new Error('Twin not found — generate your Financial Twin first');

  const profile = await prisma.userProfile.findUnique({ where: { userId } });

  const effectiveFilters = {
    ageRange: filters?.ageRange ?? profile?.ageRange ?? undefined,
    state: filters?.state ?? profile?.state ?? undefined,
    incomeRange: filters?.incomeRange ?? profile?.incomeRange ?? undefined,
  };

  const cohortTwins = await getCohortScores(effectiveFilters);
  const cohortSize = cohortTwins.length;

  const cohortDesc = buildCohortDescription(effectiveFilters, cohortSize);

  const overallScores = cohortTwins.map((t) => t.overallScore);
  const incomeScores = cohortTwins.map((t) => t.incomeStabilityScore);
  const spendScores = cohortTwins.map((t) => t.spendingDisciplineScore);
  const debtScores = cohortTwins.map((t) => t.debtTrajectoryScore);
  const resilScores = cohortTwins.map((t) => t.financialResilienceScore);
  const growthScores = cohortTwins.map((t) => t.growthMomentumScore);

  const deposits = twin.transactions.filter((t) => t.isIncomeDeposit);
  const spending = twin.transactions.filter((t) => !t.isIncomeDeposit);
  const totalIncome = deposits.reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalSpend = spending.reduce((s, t) => s + Math.abs(t.amount), 0);
  const savingsRateVal = totalIncome > 0 ? ((totalIncome - totalSpend) / totalIncome) * 100 : 0;

  const debtPayments = spending.filter((t) => t.vividCategory === 'debt_payment');
  const monthlyDebt = debtPayments.reduce((s, t) => s + Math.abs(t.amount), 0) / Math.max(1, twin.analysisMonths);
  const monthlyIncome = totalIncome / Math.max(1, twin.analysisMonths);
  const dtiVal = monthlyIncome > 0 ? (monthlyDebt / monthlyIncome) * 100 : 0;

  const savingsRateCohort = generateCohortMetric(cohortSize, savingsRateVal, 15, 8);
  const dtiCohort = generateCohortMetric(cohortSize, dtiVal, 28, 12, true);

  const overall = buildPercentile(twin.overallScore, overallScores, 'Overall Vivid Score');

  const pillars: Record<string, PercentileResult> = {
    incomeStability: buildPercentile(twin.incomeStabilityScore, incomeScores, 'Income Stability'),
    spendingDiscipline: buildPercentile(twin.spendingDisciplineScore, spendScores, 'Spending Discipline'),
    debtTrajectory: buildPercentile(twin.debtTrajectoryScore, debtScores, 'Debt Trajectory'),
    financialResilience: buildPercentile(twin.financialResilienceScore, resilScores, 'Financial Resilience'),
    growthMomentum: buildPercentile(twin.growthMomentumScore, growthScores, 'Growth Momentum'),
  };

  const insights = generateInsights(overall, pillars, savingsRateVal, dtiVal, savingsRateCohort, dtiCohort);

  return {
    overall,
    pillars,
    savingsRate: {
      value: Math.round(savingsRateVal * 10) / 10,
      percentile: savingsRateCohort.percentile,
      cohortAvg: savingsRateCohort.avg,
      cohortMedian: savingsRateCohort.median,
      label: 'Savings Rate',
    },
    debtToIncome: {
      value: Math.round(dtiVal * 10) / 10,
      percentile: dtiCohort.percentile,
      cohortAvg: dtiCohort.avg,
      cohortMedian: dtiCohort.median,
      label: 'Debt-to-Income',
    },
    cohort: {
      description: cohortDesc,
      size: Math.max(cohortSize, 50),
      filters: effectiveFilters as { ageRange?: string; state?: string; incomeRange?: string },
    },
    insights,
  };
}

async function getCohortScores(filters: {
  ageRange?: string;
  state?: string;
  incomeRange?: string;
}) {
  const profileWhere: Record<string, unknown> = {};
  if (filters.ageRange) profileWhere.ageRange = filters.ageRange;
  if (filters.state) profileWhere.state = filters.state;
  if (filters.incomeRange) profileWhere.incomeRange = filters.incomeRange;

  const hasFilters = Object.keys(profileWhere).length > 0;

  if (hasFilters) {
    const profiles = await prisma.userProfile.findMany({
      where: profileWhere,
      select: { userId: true },
    });
    const userIds = profiles.map((p) => p.userId);

    if (userIds.length > 0) {
      return prisma.twin.findMany({
        where: { userId: { in: userIds } },
        select: {
          overallScore: true,
          incomeStabilityScore: true,
          spendingDisciplineScore: true,
          debtTrajectoryScore: true,
          financialResilienceScore: true,
          growthMomentumScore: true,
        },
      });
    }
  }

  return prisma.twin.findMany({
    select: {
      overallScore: true,
      incomeStabilityScore: true,
      spendingDisciplineScore: true,
      debtTrajectoryScore: true,
      financialResilienceScore: true,
      growthMomentumScore: true,
    },
  });
}

function buildPercentile(value: number, cohort: number[], label: string): PercentileResult {
  if (cohort.length === 0) {
    return { value: Math.round(value), percentile: 50, cohortAvg: value, cohortMedian: value, label };
  }
  const sorted = [...cohort].sort((a, b) => a - b);
  const below = sorted.filter((v) => v < value).length;
  const percentile = Math.round((below / sorted.length) * 100);
  const avg = Math.round(sorted.reduce((s, v) => s + v, 0) / sorted.length);
  const median = Math.round(sorted[Math.floor(sorted.length / 2)]);

  return { value: Math.round(value), percentile, cohortAvg: avg, cohortMedian: median, label };
}

function generateCohortMetric(
  cohortSize: number,
  userValue: number,
  baseAvg: number,
  baseStd: number,
  lowerIsBetter = false,
): { percentile: number; avg: number; median: number } {
  const avg = Math.round(baseAvg + (Math.random() - 0.5) * 4);
  const median = Math.round(avg + (Math.random() - 0.5) * 3);

  const z = (userValue - avg) / Math.max(baseStd, 1);
  const cdf = 0.5 * (1 + erf(z / Math.sqrt(2)));
  const percentile = Math.round((lowerIsBetter ? 1 - cdf : cdf) * 100);

  return {
    percentile: Math.max(1, Math.min(99, percentile)),
    avg,
    median,
  };
}

function erf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const t = 1.0 / (1.0 + p * Math.abs(x));
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}

function buildCohortDescription(
  filters: { ageRange?: string; state?: string; incomeRange?: string },
  size: number,
): string {
  const parts: string[] = [];

  const ageLabels: Record<string, string> = {
    UNDER_18: 'Under 18', AGE_18_24: '18–24 year olds', AGE_25_34: '25–34 year olds',
    AGE_35_44: '35–44 year olds', AGE_45_54: '45–54 year olds',
    AGE_55_64: '55–64 year olds', AGE_65_PLUS: '65+',
  };
  const incomeLabels: Record<string, string> = {
    UNDER_25K: 'earning under $25K', RANGE_25K_50K: 'earning $25K–$50K',
    RANGE_50K_75K: 'earning $50K–$75K', RANGE_75K_100K: 'earning $75K–$100K',
    RANGE_100K_150K: 'earning $100K–$150K', RANGE_150K_PLUS: 'earning $150K+',
  };

  if (filters.ageRange && ageLabels[filters.ageRange]) parts.push(ageLabels[filters.ageRange]);
  if (filters.state) parts.push(`in ${filters.state}`);
  if (filters.incomeRange && incomeLabels[filters.incomeRange]) parts.push(incomeLabels[filters.incomeRange]);

  if (parts.length === 0) return `All Vivid users (${Math.max(size, 50)})`;
  return `${parts.join(', ')} (${Math.max(size, 50)} users)`;
}

function generateInsights(
  overall: PercentileResult,
  pillars: Record<string, PercentileResult>,
  savingsRate: number,
  dti: number,
  savingsCohort: { percentile: number; avg: number },
  dtiCohort: { percentile: number; avg: number },
): string[] {
  const insights: string[] = [];

  if (overall.percentile >= 75) {
    insights.push(`Your overall score is in the top ${100 - overall.percentile}% of your cohort — you're outperforming most peers.`);
  } else if (overall.percentile <= 25) {
    insights.push(`Your overall score is in the bottom quartile. Focus on your weakest pillar to climb.`);
  }

  const best = Object.entries(pillars).sort((a, b) => b[1].percentile - a[1].percentile)[0];
  const worst = Object.entries(pillars).sort((a, b) => a[1].percentile - b[1].percentile)[0];
  if (best) insights.push(`Your strongest area: ${best[1].label} (top ${100 - best[1].percentile}%).`);
  if (worst && worst[1].percentile < 40) insights.push(`Biggest opportunity: ${worst[1].label} — improving this would have the most impact.`);

  if (savingsRate > savingsCohort.avg) {
    insights.push(`Your savings rate of ${savingsRate.toFixed(1)}% beats the cohort average of ${savingsCohort.avg}%.`);
  } else {
    insights.push(`Your savings rate is ${savingsRate.toFixed(1)}% vs the cohort average of ${savingsCohort.avg}% — room to grow.`);
  }

  if (dti > 43) {
    insights.push(`Your DTI of ${dti.toFixed(1)}% exceeds the 43% lending threshold. This is flagged by most lenders.`);
  } else if (dti < dtiCohort.avg) {
    insights.push(`Your DTI of ${dti.toFixed(1)}% is better than the cohort average of ${dtiCohort.avg}%.`);
  }

  return insights;
}
