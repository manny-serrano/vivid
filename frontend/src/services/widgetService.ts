import { api } from './api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WidgetTemplate = 'LENDING' | 'RENTAL' | 'GIG_HIRING' | 'CHECKOUT' | 'GENERIC';
export type WidgetSessionStatus = 'PENDING' | 'CONSENTED' | 'COMPLETED' | 'EXPIRED' | 'DENIED';

export interface WidgetConfig {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerDomain: string;
  template: WidgetTemplate;
  allowedOrigins: string[];
  brandColor: string;
  logoUrl?: string;
  scopes: string[];
  callbackUrl?: string;
  webhookUrl?: string;
  active: boolean;
  totalSessions: number;
  totalConversions: number;
  createdAt: string;
  _count?: { sessions: number };
}

export interface WidgetPublicConfig {
  id: string;
  partnerName: string;
  partnerDomain: string;
  template: WidgetTemplate;
  brandColor: string;
  logoUrl?: string;
  scopes: string[];
  active: boolean;
}

export interface WidgetCreateResult {
  id: string;
  apiKey: string;
  partnerName: string;
  template: string;
  scopes: string[];
  embedCode: string;
  message: string;
}

export interface WidgetAnalytics {
  widgetId: string;
  partnerName: string;
  template: string;
  totalSessions: number;
  completed: number;
  denied: number;
  expired: number;
  pending: number;
  conversionRate: number;
}

export interface WidgetSessionInit {
  sessionToken: string;
  expiresAt: string;
  widget: {
    partnerName: string;
    template: string;
    brandColor: string;
    logoUrl?: string;
    scopes: string[];
  };
}

export interface ScopesAndTemplates {
  scopes: string[];
  templates: string[];
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export const widgetService = {
  create: (data: {
    partnerName: string;
    partnerDomain: string;
    template: string;
    allowedOrigins: string[];
    brandColor?: string;
    logoUrl?: string;
    scopes?: string[];
    callbackUrl?: string;
    webhookUrl?: string;
  }) => api.post<WidgetCreateResult>('/widget/create', data).then((r) => r.data),

  listMine: () =>
    api.get<{ widgets: WidgetConfig[] }>('/widget/mine').then((r) => r.data.widgets),

  getAnalytics: (widgetId: string) =>
    api.get<WidgetAnalytics>(`/widget/${widgetId}/analytics`).then((r) => r.data),

  getConfig: (widgetId: string) =>
    api.get<WidgetPublicConfig>(`/widget/${widgetId}/config`).then((r) => r.data),

  getScopesAndTemplates: () =>
    api.get<ScopesAndTemplates>('/widget/scopes').then((r) => r.data),

  initiateSession: (widgetId: string) =>
    api.post<WidgetSessionInit>(`/widget/${widgetId}/session`).then((r) => r.data),

  consent: (sessionToken: string, consentedScopes: string[]) =>
    api.post('/widget/consent', { sessionToken, consentedScopes }).then((r) => r.data),

  complete: (sessionToken: string) =>
    api.post('/widget/complete', { sessionToken }).then((r) => r.data),

  deny: (sessionToken: string) =>
    api.post('/widget/deny', { sessionToken }).then((r) => r.data),
};
