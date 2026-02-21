export interface PlaidLinkTokenResponse {
  linkToken: string;
  expiration: string;
}

export interface PlaidExchangeTokenRequest {
  publicToken: string;
}

export interface PlaidExchangeTokenResponse {
  success: boolean;
  message: string;
}

export interface PlaidTransaction {
  transactionId: string;
  amount: number;
  date: string;
  merchantName: string | null;
  category: string[];
  pending: boolean;
  accountId: string;
}

export interface PlaidAccount {
  accountId: string;
  name: string;
  type: string;
  subtype: string | null;
  balances: {
    available: number | null;
    current: number | null;
    limit: number | null;
  };
}

export interface PlaidConnectionStatus {
  connected: boolean;
  itemId: string | null;
  institutionName: string | null;
  lastSynced: string | null;
}
