import { api } from './api';

export interface TwinTransaction {
  id: string;
  date: string;
  amount: number;
  merchantName?: string | null;
  vividCategory: string;
  isRecurring: boolean;
  isIncomeDeposit: boolean;
  confidenceScore: number;
}

export interface TwinProfile {
  id: string;
  userId: string;
  incomeStabilityScore: number;
  spendingDisciplineScore: number;
  debtTrajectoryScore: number;
  financialResilienceScore: number;
  growthMomentumScore: number;
  overallScore: number;
  consumerNarrative: string;
  institutionNarrative: string;
  personalLoanReadiness: number;
  autoLoanReadiness: number;
  mortgageReadiness: number;
  smallBizReadiness: number;
  profileHash: string;
  hederaTopicId: string;
  hederaTransactionId: string | null;
  hederaTimestamp: string | null;
  blockchainVerified: boolean;
  generatedAt: string;
  updatedAt: string;
  transactionCount: number;
  analysisMonths: number;
  transactions: TwinTransaction[];
}

export async function fetchTwin(): Promise<TwinProfile> {
  const { data } = await api.get<TwinProfile>('/twin');
  return data;
}
