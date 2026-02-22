import { api } from './api';

export interface SyncLogEntry {
  id: string;
  webhookType: string;
  webhookCode: string;
  newCount: number;
  removedCount: number;
  status: string;
  errorMessage: string | null;
  processedAt: string | null;
  createdAt: string;
}

export interface SyncDashboard {
  lastSyncAt: string | null;
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  transactionsIngested: number;
  recentLogs: SyncLogEntry[];
  syncHealth: 'healthy' | 'degraded' | 'offline';
  nextExpectedSync: string | null;
}

export const syncService = {
  getDashboard: () => api.get<SyncDashboard>('/sync/dashboard').then((r) => r.data),
  triggerSync: () => api.post<{ success: boolean; message: string }>('/sync/trigger').then((r) => r.data),
};
