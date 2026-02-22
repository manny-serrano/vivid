import { api } from './api';

export interface BadgeItem {
  id: string;
  consentToken: string;
  label?: string;
  allowedScopes: string[];
  expiresAt?: string;
  revokedAt?: string;
  accessCount: number;
  lastAccessedAt?: string;
  createdAt: string;
}

export interface BadgeCreateResult {
  id: string;
  consentToken: string;
  scopes: string[];
  label?: string;
  expiresAt?: string;
  verifyEndpoint: string;
}

export interface BadgeVerifyResult {
  valid: boolean;
  status?: string;
  reason?: string;
  label?: string;
  issuedAt?: string;
  expiresAt?: string;
  overallScore?: number;
  scoreTier?: string;
  [key: string]: unknown;
}

export const SCOPE_LABELS: Record<string, string> = {
  overall_score: 'Overall Score',
  score_tier: 'Score Tier',
  income_stability: 'Income Stability',
  spending_discipline: 'Spending Discipline',
  debt_trajectory: 'Debt Trajectory',
  financial_resilience: 'Financial Resilience',
  growth_momentum: 'Growth Momentum',
  blockchain_verified: 'Blockchain Verification',
  lending_readiness: 'Lending Readiness',
};

export const badgeService = {
  getScopes: () => api.get<string[]>('/verify/scopes').then((r) => r.data),

  createBadge: (data: { scopes: string[]; label?: string; expiresInDays?: number }) =>
    api.post<BadgeCreateResult>('/verify', data).then((r) => r.data),

  listBadges: () => api.get<BadgeItem[]>('/verify').then((r) => r.data),

  verifyBadge: (consentToken: string) =>
    api.get<BadgeVerifyResult>(`/verify/${consentToken}`).then((r) => r.data),

  revokeBadge: (badgeId: string) =>
    api.post(`/verify/${badgeId}/revoke`).then((r) => r.data),
};
