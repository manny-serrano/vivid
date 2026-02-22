import { api } from './api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AttestationProviderType =
  | 'EMPLOYER'
  | 'LANDLORD'
  | 'LENDER'
  | 'GIG_PLATFORM'
  | 'PAYROLL_PROVIDER'
  | 'UTILITY'
  | 'GOVERNMENT'
  | 'OTHER';

export type AttestationType =
  | 'VERIFIED_INCOME'
  | 'ON_TIME_RENT'
  | 'EMPLOYMENT_VERIFIED'
  | 'GIG_EARNINGS'
  | 'LOAN_REPAYMENT'
  | 'UTILITY_PAYMENT'
  | 'IDENTITY_VERIFIED'
  | 'REFERENCE'
  | 'CUSTOM';

export interface AttestationProvider {
  id: string;
  name: string;
  type: AttestationProviderType;
  domain: string;
  verified: boolean;
  logoUrl?: string;
  createdAt: string;
  _count?: { attestations: number };
}

export interface Attestation {
  id: string;
  userId: string;
  twinId: string;
  providerId: string;
  attestationType: AttestationType;
  claim: string;
  details?: string;
  evidence?: string;
  startDate?: string;
  endDate?: string;
  strength: number;
  attestationHash: string;
  hederaTransactionId?: string;
  hederaTimestamp?: string;
  hederaTopicId?: string;
  revokedAt?: string;
  expiresAt?: string;
  verificationCount: number;
  createdAt: string;
  provider: {
    id: string;
    name: string;
    type: AttestationProviderType;
    domain: string;
    verified: boolean;
    logoUrl?: string;
  };
}

export interface ReputationBreakdown {
  category: string;
  count: number;
  avgStrength: number;
  verified: boolean;
}

export interface ReputationScore {
  overall: number;
  attestationCount: number;
  providerCount: number;
  verifiedProviderCount: number;
  strongestCategory: string;
  breakdown: ReputationBreakdown[];
  trustMultiplier: number;
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'user' | 'provider';
  verified?: boolean;
  logoUrl?: string;
  providerType?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  attestationType: string;
  claim: string;
  strength: number;
  hederaVerified: boolean;
  createdAt: string;
}

export interface ReputationGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface AttestationDashboard {
  attestations: Attestation[];
  reputation: ReputationScore;
  graph: ReputationGraph;
}

export interface VerificationResult {
  valid: boolean;
  reason?: string;
  attestationType?: string;
  claim?: string;
  provider?: { name: string; type: string; verified: boolean; domain: string };
  strength?: number;
  hederaTransactionId?: string;
  hederaTopicId?: string;
  hederaTimestamp?: string;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

export const attestationService = {
  getMyDashboard: () =>
    api.get<AttestationDashboard>('/attestations/me').then((r) => r.data),

  getReputation: () =>
    api.get<ReputationScore>('/attestations/reputation').then((r) => r.data),

  getGraph: () =>
    api.get<ReputationGraph>('/attestations/graph').then((r) => r.data),

  requestAttestation: (data: {
    providerDomain: string;
    attestationType: string;
    message?: string;
  }) => api.post('/attestations/request', data).then((r) => r.data),

  verify: (attestationHash: string) =>
    api.get<VerificationResult>(`/attestations/verify/${attestationHash}`).then((r) => r.data),

  listProviders: () =>
    api.get<{ providers: AttestationProvider[] }>('/attestations/providers').then((r) => r.data.providers),
};
