export type InstitutionType = 'CREDIT_UNION' | 'COMMUNITY_BANK' | 'OTHER';

export interface Institution {
  id: string;
  name: string;
  type: InstitutionType;
  email: string;
  firebaseUid: string;
  logoUrl: string | null;
  createdAt: string;
}

export interface LendingRecommendation {
  loanType: 'personal' | 'auto' | 'mortgage' | 'small_business';
  readinessScore: number;
  recommendation: 'Favorable' | 'Conditional' | 'Unfavorable';
  rationale: string;
  confidence: number;
}

export interface ApplicantView {
  shareToken: string;
  applicantName: string;
  overallScore: number | null;
  dimensionScores: Record<string, number> | null;
  consumerNarrative: string | null;
  institutionNarrative: string | null;
  lendingReadiness: LendingRecommendation[] | null;
  blockchainVerified: boolean;
  profileHash: string | null;
  hederaTransactionId: string | null;
  analysisMonths: number;
  generatedAt: string;
  permissions: SharePermissions;
}

export interface SharePermissions {
  showOverallScore: boolean;
  showDimensionScores: boolean;
  showNarrative: boolean;
  showTimeline: boolean;
  showTransactions: boolean;
  showLendingReadiness: boolean;
  showBlockchainProof: boolean;
}

export interface ComplianceAuditEntry {
  action: string;
  timestamp: string;
  actor: string;
  details: string;
  hederaTransactionId: string | null;
}
