import { useQuery } from '@tanstack/react-query';
import { fetchTwin } from '../services/twinService';
import { useAuthStore } from '../store/authStore';

export function useTwin() {
  const idToken = useAuthStore((s) => s.idToken);
  return useQuery({
    queryKey: ['twin'],
    queryFn: fetchTwin,
    enabled: !!idToken,
  });
}
