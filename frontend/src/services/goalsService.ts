import { api } from './api';

export type GoalCategory =
  | 'SAVINGS'
  | 'DEBT_PAYOFF'
  | 'EMERGENCY_FUND'
  | 'SCORE_IMPROVEMENT'
  | 'MORTGAGE_READY'
  | 'SPENDING_REDUCTION'
  | 'INCOME_GROWTH'
  | 'CUSTOM';

export type GoalStatus = 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'ABANDONED';

export interface Milestone {
  id: string;
  title: string;
  targetValue: number;
  reached: boolean;
  reachedAt: string | null;
  sortOrder: number;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  category: GoalCategory;
  targetValue: number;
  currentValue: number;
  unit: string;
  targetDate: string;
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  milestones: Milestone[];
}

export interface GoalStats {
  total: number;
  active: number;
  completed: number;
  avgProgress: number;
  streak: number;
  topCategory: string;
}

export interface CreateGoalInput {
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

export const goalsService = {
  list: () => api.get<Goal[]>('/goals').then((r) => r.data),
  get: (id: string) => api.get<Goal>(`/goals/${id}`).then((r) => r.data),
  create: (data: CreateGoalInput) => api.post<Goal>('/goals', data).then((r) => r.data),
  update: (id: string, data: UpdateGoalInput) => api.patch<Goal>(`/goals/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/goals/${id}`).then((r) => r.data),
  autoProgress: () => api.post<Goal[]>('/goals/auto-progress').then((r) => r.data),
  stats: () => api.get<GoalStats>('/goals/stats').then((r) => r.data),
};
