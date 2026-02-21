import { api } from './api';

export interface LinkTokenResponse {
  linkToken: string;
  expiration: string;
}

export async function getLinkToken(): Promise<LinkTokenResponse> {
  const { data } = await api.get<LinkTokenResponse>('/plaid/link-token');
  return data;
}

export async function exchangeToken(publicToken: string): Promise<{ success: boolean; message: string }> {
  const { data } = await api.post<{ success: boolean; message: string }>('/plaid/exchange-token', {
    publicToken,
  });
  return data;
}
