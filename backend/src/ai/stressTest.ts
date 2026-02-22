// ---------------------------------------------------------------------------
// Vivid – Predictive Stress Testing ("What-If" Simulations)
// ---------------------------------------------------------------------------

import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import type { VividScores } from './scoreCalculator.js';
import { clamp, mean, linearRegressionSlope } from './scoreCalculator.js';
import type { MonthlyData } from './scoreCalculator.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StressScenario {
  id: string;
  label: string;
  description: string;
}

export interface StressTestInput {
  scenarioId: string;
  customLabel?: string;
  incomeReductionPercent?: number;
  expenseIncreasePercent?: number;
  emergencyExpense?: number;
}

export interface RunwayResult {
  monthsOfRunway: number;
  adjustedResilience: number;
  impactSeverity: 'low' | 'moderate' | 'high' | 'critical';
  adjustedScores: VividScores;
  breakdown: {
    currentMonthlyIncome: number;
    simulatedMonthlyIncome: number;
    currentMonthlyExpenses: number;
    simulatedMonthlyExpenses: number;
    currentMonthlySurplus: number;
    simulatedMonthlySurplus: number;
    estimatedSavings: number;
  };
  recommendations: string[];
  aiNarrative: string | null;
}

// ---------------------------------------------------------------------------
// Built-in scenarios
// ---------------------------------------------------------------------------

export const BUILT_IN_SCENARIOS: StressScenario[] = [
  {
    id: 'lose_primary_income',
    label: 'Lose Primary Income Source',
    description: 'What if you lost your largest income source entirely?',
  },
  {
    id: 'income_50_cut',
    label: '50% Income Reduction',
    description: 'What if your total income dropped by half?',
  },
  {
    id: 'income_25_cut',
    label: '25% Income Reduction',
    description: 'What if your income decreased by 25%?',
  },
  {
    id: 'expense_spike_30',
    label: '30% Expense Increase',
    description: 'What if your monthly expenses jumped 30% (inflation, rent hike, etc.)?',
  },
  {
    id: 'medical_emergency',
    label: 'Medical Emergency ($5,000)',
    description: 'What if you had a sudden $5,000 medical bill?',
  },
  {
    id: 'car_repair',
    label: 'Major Car Repair ($3,000)',
    description: 'What if you needed a $3,000 car repair?',
  },
  {
    id: 'job_loss_6_months',
    label: 'Job Loss (6 months unemployed)',
    description: 'What if you lost your job and it took 6 months to find a new one?',
  },
  {
    id: 'custom',
    label: 'Custom Scenario',
    description: 'Define your own income reduction, expense increase, or emergency expense.',
  },
];

// ---------------------------------------------------------------------------
// Core simulation engine
// ---------------------------------------------------------------------------

function resolveScenarioParams(input: StressTestInput): {
  incomeReduction: number;
  expenseIncrease: number;
  emergencyHit: number;
} {
  switch (input.scenarioId) {
    case 'lose_primary_income':
      return { incomeReduction: 0.65, expenseIncrease: 0, emergencyHit: 0 };
    case 'income_50_cut':
      return { incomeReduction: 0.5, expenseIncrease: 0, emergencyHit: 0 };
    case 'income_25_cut':
      return { incomeReduction: 0.25, expenseIncrease: 0, emergencyHit: 0 };
    case 'expense_spike_30':
      return { incomeReduction: 0, expenseIncrease: 0.3, emergencyHit: 0 };
    case 'medical_emergency':
      return { incomeReduction: 0, expenseIncrease: 0, emergencyHit: 5000 };
    case 'car_repair':
      return { incomeReduction: 0, expenseIncrease: 0, emergencyHit: 3000 };
    case 'job_loss_6_months':
      return { incomeReduction: 1.0, expenseIncrease: 0, emergencyHit: 0 };
    case 'custom':
      return {
        incomeReduction: (input.incomeReductionPercent ?? 0) / 100,
        expenseIncrease: (input.expenseIncreasePercent ?? 0) / 100,
        emergencyHit: input.emergencyExpense ?? 0,
      };
    default:
      return { incomeReduction: 0, expenseIncrease: 0, emergencyHit: 0 };
  }
}

export async function runStressTest(
  scores: VividScores,
  monthlyData: MonthlyData[],
  input: StressTestInput,
): Promise<RunwayResult> {
  const params = resolveScenarioParams(input);

  const avgIncome = mean(monthlyData.map((m) => m.totalDeposits));
  const avgExpenses = mean(monthlyData.map((m) => m.totalSpending));
  const avgSurplus = avgIncome - avgExpenses;

  const balances = monthlyData.map((m) => m.endBalance);
  const latestBalance = balances.length > 0 ? balances[balances.length - 1] : 0;
  const estimatedSavings = Math.max(latestBalance, 0);

  const simIncome = avgIncome * (1 - params.incomeReduction);
  const simExpenses = avgExpenses * (1 + params.expenseIncrease);
  const simSurplus = simIncome - simExpenses;
  const effectiveSavings = Math.max(estimatedSavings - params.emergencyHit, 0);

  let monthsOfRunway: number;
  if (simSurplus >= 0) {
    monthsOfRunway = 999;
  } else {
    monthsOfRunway = Math.max(0, Math.floor(effectiveSavings / Math.abs(simSurplus)));
  }

  if (input.scenarioId === 'job_loss_6_months') {
    monthsOfRunway = Math.min(monthsOfRunway, effectiveSavings > 0 ? Math.floor(effectiveSavings / simExpenses) : 0);
  }

  const adjustedResilience = computeAdjustedResilience(scores.financialResilience, monthsOfRunway, params);
  const adjustedScores = computeAdjustedScores(scores, params, monthsOfRunway);

  const impactSeverity =
    monthsOfRunway >= 6 ? 'low' :
    monthsOfRunway >= 3 ? 'moderate' :
    monthsOfRunway >= 1 ? 'high' :
    'critical';

  const recommendations = generateRecommendations(monthsOfRunway, params, scores, avgIncome, avgExpenses);

  const scenario = BUILT_IN_SCENARIOS.find((s) => s.id === input.scenarioId);
  const scenarioLabel = input.customLabel ?? scenario?.label ?? 'Custom Scenario';

  const aiNarrative = await generateStressNarrative(
    scenarioLabel,
    monthsOfRunway,
    adjustedScores,
    { avgIncome, simIncome, avgExpenses, simExpenses, estimatedSavings: effectiveSavings },
    recommendations,
  );

  return {
    monthsOfRunway: Math.min(monthsOfRunway, 36),
    adjustedResilience,
    impactSeverity,
    adjustedScores,
    breakdown: {
      currentMonthlyIncome: Math.round(avgIncome),
      simulatedMonthlyIncome: Math.round(simIncome),
      currentMonthlyExpenses: Math.round(avgExpenses),
      simulatedMonthlyExpenses: Math.round(simExpenses),
      currentMonthlySurplus: Math.round(avgSurplus),
      simulatedMonthlySurplus: Math.round(simSurplus),
      estimatedSavings: Math.round(effectiveSavings),
    },
    recommendations,
    aiNarrative,
  };
}

// ---------------------------------------------------------------------------
// Adjusted scores under stress
// ---------------------------------------------------------------------------

function computeAdjustedResilience(
  baseResilience: number,
  runway: number,
  params: { incomeReduction: number; expenseIncrease: number; emergencyHit: number },
): number {
  let adjusted = baseResilience;
  if (runway < 1) adjusted -= 40;
  else if (runway < 3) adjusted -= 25;
  else if (runway < 6) adjusted -= 10;

  if (params.incomeReduction >= 0.5) adjusted -= 15;
  if (params.emergencyHit > 0) adjusted -= Math.min(params.emergencyHit / 500, 15);

  return clamp(Math.round(adjusted), 0, 100);
}

function computeAdjustedScores(
  scores: VividScores,
  params: { incomeReduction: number; expenseIncrease: number; emergencyHit: number },
  runway: number,
): VividScores {
  const incomeStability = clamp(
    Math.round(scores.incomeStability * (1 - params.incomeReduction * 0.8)),
    0, 100,
  );
  const spendingDiscipline = clamp(
    Math.round(scores.spendingDiscipline - params.expenseIncrease * 30),
    0, 100,
  );
  const financialResilience = computeAdjustedResilience(scores.financialResilience, runway, params);
  const debtTrajectory = clamp(
    Math.round(scores.debtTrajectory - (params.incomeReduction > 0.3 ? 15 : 0)),
    0, 100,
  );
  const growthMomentum = clamp(
    Math.round(scores.growthMomentum - (runway < 3 ? 20 : runway < 6 ? 10 : 0)),
    0, 100,
  );

  const overall = clamp(
    Math.round(
      incomeStability * 0.25 +
      spendingDiscipline * 0.2 +
      debtTrajectory * 0.2 +
      financialResilience * 0.2 +
      growthMomentum * 0.15,
    ),
    0, 100,
  );

  return {
    incomeStability,
    spendingDiscipline,
    debtTrajectory,
    financialResilience,
    growthMomentum,
    overall,
  };
}

// ---------------------------------------------------------------------------
// Recommendation engine
// ---------------------------------------------------------------------------

function generateRecommendations(
  runway: number,
  params: { incomeReduction: number; expenseIncrease: number; emergencyHit: number },
  scores: VividScores,
  avgIncome: number,
  avgExpenses: number,
): string[] {
  const recs: string[] = [];

  if (runway < 3) {
    recs.push('Build an emergency fund covering at least 3 months of expenses — this is your top priority.');
  }

  if (params.incomeReduction > 0) {
    if (scores.incomeStability < 60) {
      recs.push('Diversify your income streams. Relying on a single source makes you vulnerable to disruptions.');
    }
    recs.push('Identify non-essential expenses you could cut immediately if income dropped — have a "financial fire drill" plan.');
  }

  if (params.expenseIncrease > 0) {
    recs.push('Review recurring subscriptions and discretionary spending for quick wins.');
    if (avgExpenses > avgIncome * 0.8) {
      recs.push('Your expense-to-income ratio is already tight. Even small spending increases could push you into deficit.');
    }
  }

  if (params.emergencyHit > 0) {
    if (scores.financialResilience < 50) {
      recs.push(`A $${params.emergencyHit.toLocaleString()} emergency would significantly impact your finances. Consider high-yield savings or a dedicated emergency fund.`);
    }
    recs.push('Look into insurance options to protect against unexpected large expenses.');
  }

  if (runway >= 6 && runway < 12) {
    recs.push('You have a reasonable buffer, but pushing it to 6-12 months would give you much more breathing room.');
  }

  if (runway >= 12) {
    recs.push('Your financial cushion is solid. Consider whether excess savings could be working harder in investments.');
  }

  if (recs.length === 0) {
    recs.push('Your current financial position handles this scenario well. Keep building your resilience.');
  }

  return recs;
}

// ---------------------------------------------------------------------------
// Gemini narrative (with template fallback)
// ---------------------------------------------------------------------------

async function generateStressNarrative(
  scenarioLabel: string,
  runway: number,
  adjustedScores: VividScores,
  numbers: {
    avgIncome: number;
    simIncome: number;
    avgExpenses: number;
    simExpenses: number;
    estimatedSavings: number;
  },
  recommendations: string[],
): Promise<string | null> {
  try {
    const { VertexAI } = await import('@google-cloud/vertexai');
    const vertexAI = new VertexAI({ project: env.GCP_PROJECT_ID, location: env.VERTEX_AI_LOCATION });
    const model = vertexAI.getGenerativeModel({
      model: env.VERTEX_AI_MODEL,
      generationConfig: { temperature: 0.7, topP: 0.9, maxOutputTokens: 1024 },
      systemInstruction: `You are a financial stress-test analyst for Vivid. Write a concise, empathetic analysis (3-5 paragraphs) of a "What-If" scenario. Be honest about risks but frame them as actionable opportunities. Use plain language. Don't output JSON or code.`,
    });

    const prompt = `SCENARIO: ${scenarioLabel}

CURRENT FINANCIAL STATE:
- Monthly Income: $${Math.round(numbers.avgIncome).toLocaleString()}
- Monthly Expenses: $${Math.round(numbers.avgExpenses).toLocaleString()}
- Estimated Savings: $${Math.round(numbers.estimatedSavings).toLocaleString()}

SIMULATED STATE:
- Simulated Monthly Income: $${Math.round(numbers.simIncome).toLocaleString()}
- Simulated Monthly Expenses: $${Math.round(numbers.simExpenses).toLocaleString()}
- Months of Runway: ${runway >= 36 ? '36+' : runway}
- Adjusted Overall Vivid Score: ${adjustedScores.overall}/100

KEY RECOMMENDATIONS:
${recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Write a personalized stress-test narrative addressing: (1) the immediate impact, (2) how long their savings would last, (3) which financial dimensions are most affected, and (4) concrete next steps.`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    return result.response.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  } catch (err) {
    logger.warn('[stress-test] Vertex AI unavailable, skipping AI narrative', {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
