import { api } from './api';

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

export interface BenchmarkResult {
  overall: PercentileResult;
  pillars: Record<string, PercentileResult>;
  savingsRate: PercentileResult;
  debtToIncome: PercentileResult;
  cohort: CohortInfo;
  insights: string[];
}

export interface BenchmarkFilters {
  ageRange?: string;
  state?: string;
  incomeRange?: string;
}

export const benchmarkService = {
  get: (filters?: BenchmarkFilters) => {
    const params = new URLSearchParams();
    if (filters?.ageRange) params.set('ageRange', filters.ageRange);
    if (filters?.state) params.set('state', filters.state);
    if (filters?.incomeRange) params.set('incomeRange', filters.incomeRange);
    return api.get<BenchmarkResult>(`/benchmark?${params}`).then((r) => r.data);
  },
};
