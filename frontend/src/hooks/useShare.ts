import { useMutation, useQuery } from '@tanstack/react-query';
import {
  createShareToken,
  getShareTokens,
  revokeShareToken,
  type CreateShareInput,
} from '../services/shareService';

export function useShareTokens() {
  return useQuery({ queryKey: ['shareTokens'], queryFn: getShareTokens });
}

export function useCreateShare() {
  return useMutation({ mutationFn: (input: CreateShareInput) => createShareToken(input) });
}

export function useRevokeShare() {
  return useMutation({ mutationFn: (tokenId: string) => revokeShareToken(tokenId) });
}
