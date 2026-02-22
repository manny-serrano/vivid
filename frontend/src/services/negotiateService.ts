import { api } from './api';

export interface NegotiableBill {
  id: string;
  merchantName: string;
  currentMonthly: number;
  estimatedFair: number;
  potentialSavings: number;
  annualSavings: number;
  category: string;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  negotiationType: string;
}

export interface GeneratedEmail {
  subject: string;
  body: string;
  recipientHint: string;
  tone: string;
  negotiationType: string;
}

export const negotiateService = {
  detectBills: (): Promise<{ bills: NegotiableBill[] }> =>
    api.get('/negotiate/bills').then((r) => r.data),

  generateEmail: (params: {
    merchantName: string;
    currentMonthly: number;
    estimatedFair: number;
    negotiationType: string;
    tone?: string;
  }): Promise<GeneratedEmail> =>
    api.post('/negotiate/generate-email', params).then((r) => r.data),

  refineEmail: (params: {
    currentEmail: string;
    instruction: string;
    merchantName: string;
    currentMonthly: number;
    estimatedFair: number;
  }): Promise<GeneratedEmail> =>
    api.post('/negotiate/refine-email', params).then((r) => r.data),
};
