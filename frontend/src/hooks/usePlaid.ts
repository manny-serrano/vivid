import { useMutation, useQuery } from '@tanstack/react-query';
import { getLinkToken, exchangeToken } from '../services/plaidService';
import { useAuthStore } from '../store/authStore';

export function useLinkToken() {
  const idToken = useAuthStore((s) => s.idToken);
  return useQuery({
    queryKey: ['plaid', 'linkToken'],
    queryFn: getLinkToken,
    enabled: !!idToken,
  });
}

export function useExchangeToken() {
  return useMutation({
    mutationFn: (publicToken: string) => exchangeToken(publicToken),
  });
}
