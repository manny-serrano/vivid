import { api } from './api';

export interface WrappedCard {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  stat?: string;
  statLabel?: string;
  secondaryStat?: string;
  secondaryLabel?: string;
  narrative: string;
  gradient: string;
  icon: string;
  items?: Array<{ label: string; value: string; color?: string }>;
}

export interface WrappedData {
  userName: string;
  year: number;
  generatedAt: string;
  cards: WrappedCard[];
}

export const wrappedService = {
  getWrapped: (): Promise<WrappedData> =>
    api.get('/wrapped').then((r) => r.data),
};
