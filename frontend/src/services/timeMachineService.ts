import { api } from './api';

export interface ScenarioPreset {
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

export interface VividScores {
  incomeStability: number;
  spendingDiscipline: number;
  debtTrajectory: number;
  financialResilience: number;
  growthMomentum: number;
  overall: number;
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

export const timeMachineService = {
  getPresets: () =>
    api.get<ScenarioPreset[]>('/time-machine/presets').then((r) => r.data),

  simulate: (modifiers: Partial<ScenarioPreset>[], monthsForward = 12) =>
    api.post<TimeMachineResult>('/time-machine/simulate', { modifiers, monthsForward }).then((r) => r.data),
};
