export interface TwinScores {
  incomeStabilityScore: number;
  spendingDisciplineScore: number;
  debtTrajectoryScore: number;
  financialResilienceScore: number;
  growthMomentumScore: number;
  overallScore: number;
}

export interface LendingReadiness {
  personalLoanReadiness: number;
  autoLoanReadiness: number;
  mortgageReadiness: number;
  smallBizReadiness: number;
}

export interface TwinProfile extends TwinScores, LendingReadiness {
  id: string;
  userId: string;
  consumerNarrative: string;
  institutionNarrative: string;
  profileHash: string;
  hederaTopicId: string;
  hederaTransactionId: string | null;
  hederaTimestamp: string | null;
  blockchainVerified: boolean;
  generatedAt: string;
  updatedAt: string;
  transactionCount: number;
  analysisMonths: number;
}

export interface TwinDimension {
  key: keyof TwinScores;
  label: string;
  score: number;
  color: string;
  description: string;
}

export interface TwinSummary {
  overallScore: number;
  dimensions: TwinDimension[];
  generatedAt: string;
  blockchainVerified: boolean;
}

export const DIMENSION_WEIGHTS = {
  incomeStabilityScore: 0.25,
  spendingDisciplineScore: 0.20,
  debtTrajectoryScore: 0.20,
  financialResilienceScore: 0.20,
  growthMomentumScore: 0.15,
} as const;

export const DIMENSION_LABELS: Record<keyof TwinScores, string> = {
  incomeStabilityScore: 'Income Stability',
  spendingDisciplineScore: 'Spending Discipline',
  debtTrajectoryScore: 'Debt Trajectory',
  financialResilienceScore: 'Financial Resilience',
  growthMomentumScore: 'Growth Momentum',
  overallScore: 'Overall Score',
};

export const DIMENSION_COLORS: Record<string, string> = {
  incomeStabilityScore: '#06B6D4',
  spendingDisciplineScore: '#6B21A8',
  debtTrajectoryScore: '#10B981',
  financialResilienceScore: '#F59E0B',
  growthMomentumScore: '#4F46E5',
};
