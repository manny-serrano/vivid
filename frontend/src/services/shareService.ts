import { api } from './api';

export interface CreateShareInput {
  recipientEmail?: string;
  recipientInstitution?: string;
  recipientName?: string;
  showOverallScore?: boolean;
  showDimensionScores?: boolean;
  showNarrative?: boolean;
  showTimeline?: boolean;
  showTransactions?: boolean;
  showLendingReadiness?: boolean;
  showBlockchainProof?: boolean;
  expiresInDays?: number;
}

export interface ShareTokenResponse {
  id: string;
  token: string;
  shareUrl: string;
  recipientEmail: string | null;
  recipientInstitution: string | null;
  recipientName: string | null;
  permissions: Record<string, boolean>;
  expiresAt: string | null;
  createdAt: string;
}

export async function createShareToken(input: CreateShareInput): Promise<ShareTokenResponse> {
  const { data } = await api.post<ShareTokenResponse>('/share', input);
  return data;
}

export async function getShareTokens(): Promise<unknown[]> {
  const { data } = await api.get<unknown[]>('/share');
  return data;
}

export async function revokeShareToken(tokenId: string): Promise<void> {
  await api.post(`/share/${tokenId}/revoke`);
}

export async function accessShare(token: string): Promise<unknown> {
  const { data } = await api.get<unknown>(`/share/access/${token}`);
  return data;
}
