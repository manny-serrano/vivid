import { api } from './api';

export interface ClaimType {
  type: string;
  label: string;
  field: string;
}

export interface ZkpClaim {
  id: string;
  proofHash: string;
  statement: string;
  verified: boolean;
  hederaTransactionId?: string;
  hederaTopicId?: string;
  expiresAt?: string;
  verifyUrl: string;
}

export interface ClaimListItem {
  id: string;
  claimType: string;
  claimStatement: string;
  claimResult: boolean;
  proofHash: string;
  recipientLabel?: string;
  hederaTransactionId?: string;
  expiresAt?: string;
  revokedAt?: string;
  accessCount: number;
  createdAt: string;
}

export interface VerifyResult {
  valid: boolean;
  reason?: string;
  statement?: string;
  verified?: boolean;
  claimHash?: string;
  hederaTransactionId?: string;
  hederaTopicId?: string;
  hederaTimestamp?: string;
  createdAt?: string;
  expiresAt?: string;
}

export const zkpService = {
  getClaimTypes: () => api.get<ClaimType[]>('/zkp/types').then((r) => r.data),

  createClaim: (data: {
    claimType: string;
    threshold: number;
    recipientLabel?: string;
    expiresInDays?: number;
  }) => api.post<ZkpClaim>('/zkp', data).then((r) => r.data),

  listClaims: () => api.get<ClaimListItem[]>('/zkp').then((r) => r.data),

  verifyClaim: (proofHash: string) =>
    api.get<VerifyResult>(`/zkp/verify/${proofHash}`).then((r) => r.data),

  revokeClaim: (claimId: string) =>
    api.post(`/zkp/${claimId}/revoke`).then((r) => r.data),
};
