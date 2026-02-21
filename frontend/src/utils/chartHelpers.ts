export const RADAR_DIMENSION_KEYS = [
  'incomeStabilityScore',
  'spendingDisciplineScore',
  'debtTrajectoryScore',
  'financialResilienceScore',
  'growthMomentumScore',
] as const;

export const RADAR_LABELS: Record<string, string> = {
  incomeStabilityScore: 'Income Stability',
  spendingDisciplineScore: 'Spending Discipline',
  debtTrajectoryScore: 'Debt Trajectory',
  financialResilienceScore: 'Financial Resilience',
  growthMomentumScore: 'Growth Momentum',
};

export const RADAR_COLORS: Record<string, string> = {
  incomeStabilityScore: '#06B6D4',
  spendingDisciplineScore: '#6B21A8',
  debtTrajectoryScore: '#10B981',
  financialResilienceScore: '#F59E0B',
  growthMomentumScore: '#4F46E5',
};
