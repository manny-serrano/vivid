import { useMutation, useQuery } from '@tanstack/react-query';
import { getLinkToken, exchangeToken } from '../services/plaidService';

export function useLinkToken() {
  return useQuery({
    queryKey: ['plaid', 'linkToken'],
    queryFn: getLinkToken,
  });
}

export function useExchangeToken() {
  return useMutation({
    mutationFn: (publicToken: string) => exchangeToken(publicToken),
  });
}
