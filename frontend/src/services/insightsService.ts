import { api } from './api';

// ---------------------------------------------------------------------------
// Stress Testing
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
  adjustedScores: {
    incomeStability: number;
    spendingDiscipline: number;
    debtTrajectory: number;
    financialResilience: number;
    growthMomentum: number;
    overall: number;
  };
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
// Anomaly Detection
// ---------------------------------------------------------------------------

export interface Anomaly {
  type: string;
  severity: 'info' | 'warning' | 'alert';
  title: string;
  description: string;
  metric: string;
  currentValue: string;
  trend: string;
  actionableAdvice: string;
}

export interface AnomalyReport {
  anomalies: Anomaly[];
  healthScore: number;
  summary: string;
  aiInsights: string | null;
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export const insightsService = {
  getScenarios: () =>
    api.get<StressScenario[]>('/insights/stress/scenarios').then((r) => r.data),

  runStressTest: (input: StressTestInput) =>
    api.post<RunwayResult>('/insights/stress', input).then((r) => r.data),

  getAnomalies: () =>
    api.get<AnomalyReport>('/insights/anomalies').then((r) => r.data),
};
