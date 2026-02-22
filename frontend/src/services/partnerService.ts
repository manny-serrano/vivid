import { api } from './api';

export interface Partner {
  id: string;
  userId: string;
  companyName: string;
  companyDomain: string;
  industry: string;
  contactEmail: string;
  tier: 'FREE' | 'STARTER' | 'GROWTH' | 'ENTERPRISE';
  active: boolean;
  totalApiCalls: number;
  lastApiCallAt: string | null;
  createdAt: string;
}

export interface PartnerAnalytics {
  totalApiCalls: number;
  totalWidgets: number;
  totalWidgetSessions: number;
  conversionRate: number;
  totalAttestations: number;
  avgReputationImpact: number;
  callsThisMonth: number;
  callsLastMonth: number;
  growthRate: number;
}

export interface ApiUsageEntry {
  date: string;
  calls: number;
}

export interface WidgetSummary {
  id: string;
  template: string;
  totalSessions: number;
  totalConversions: number;
  active: boolean;
  createdAt: string;
}

export interface AttestationSummary {
  total: number;
  byType: Record<string, number>;
  recentCount: number;
}

export interface PartnerDashboard {
  partner: Partner;
  analytics: PartnerAnalytics;
  apiUsage: ApiUsageEntry[];
  widgets: WidgetSummary[];
  attestations: AttestationSummary;
}

export interface RegisterPartnerInput {
  companyName: string;
  companyDomain: string;
  industry: string;
  contactEmail: string;
}

export interface TierLimits {
  apiCalls: number;
  widgets: number;
  features: string[];
}

export const partnerService = {
  register: (data: RegisterPartnerInput) =>
    api.post<{ partner: Partner; apiKey: string }>('/partners/register', data).then((r) => r.data),
  getProfile: () => api.get<Partner>('/partners/profile').then((r) => r.data),
  getDashboard: () => api.get<PartnerDashboard>('/partners/dashboard').then((r) => r.data),
  regenerateKey: () => api.post<{ apiKey: string }>('/partners/regenerate-key').then((r) => r.data),
  getTiers: () => api.get<Record<string, TierLimits>>('/partners/tiers').then((r) => r.data),
};
