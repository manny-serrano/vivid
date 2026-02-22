import { api } from './api';

export type FlagSeverity = 'red' | 'yellow' | 'green';

export interface FixTimeline {
  period: string;
  action: string;
  impact: string;
}

export interface RedFlag {
  id: string;
  severity: FlagSeverity;
  title: string;
  detail: string;
  metric: string;
  lenderPerspective: string;
  fixes: FixTimeline[];
}

export interface RedFlagsReport {
  flags: RedFlag[];
  redCount: number;
  yellowCount: number;
  greenCount: number;
  summary: string;
  loanReadinessVerdict: string;
}

export const redFlagsService = {
  getReport: () =>
    api.get<RedFlagsReport>('/red-flags').then((r) => r.data),
};
