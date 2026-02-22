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

export interface TwinSnapshot {
  id: string;
  incomeStabilityScore: number;
  spendingDisciplineScore: number;
  debtTrajectoryScore: number;
  financialResilienceScore: number;
  growthMomentumScore: number;
  overallScore: number;
  snapshotAt: string;
}

export interface CategoryAggregate {
  category: string;
  total: number;
  count: number;
}

export interface CategoryDrilldown {
  category: string;
  total: number;
  count: number;
  transactions: {
    id: string;
    amount: number;
    date: string;
    merchantName: string | null;
    vividCategory: string;
    isRecurring: boolean;
    isIncomeDeposit: boolean;
  }[];
}

export async function fetchTwin(): Promise<TwinProfile> {
  const { data } = await api.get<TwinProfile>('/twin');
  return data;
}

export async function fetchSnapshots(): Promise<TwinSnapshot[]> {
  const { data } = await api.get<TwinSnapshot[]>('/twin/snapshots');
  return data;
}

export async function fetchCategoryAggregates(): Promise<CategoryAggregate[]> {
  const { data } = await api.get<CategoryAggregate[]>('/twin/categories');
  return data;
}

export async function fetchCategoryDrilldown(category: string): Promise<CategoryDrilldown> {
  const { data } = await api.get<CategoryDrilldown>(`/twin/categories/${category}`);
  return data;
}
