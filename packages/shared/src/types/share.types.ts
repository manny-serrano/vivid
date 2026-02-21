export interface CreateShareTokenRequest {
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
  permissions: ShareTokenPermissions;
  expiresAt: string | null;
  createdAt: string;
}

export interface ShareTokenPermissions {
  showOverallScore: boolean;
  showDimensionScores: boolean;
  showNarrative: boolean;
  showTimeline: boolean;
  showTransactions: boolean;
  showLendingReadiness: boolean;
  showBlockchainProof: boolean;
}

export interface ShareTokenListItem {
  id: string;
  token: string;
  recipientName: string | null;
  recipientInstitution: string | null;
  accessCount: number;
  lastAccessedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface RevokeShareTokenRequest {
  tokenId: string;
}
