import { api } from './api';

export async function viewApplicant(token: string): Promise<unknown> {
  const { data } = await api.get<unknown>(`/share/access/${token}`);
  return data;
}
