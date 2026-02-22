import { api } from './api';

export type NotificationType =
  | 'SCORE_MILESTONE' | 'SCORE_DROP' | 'INCOME_LATE' | 'INCOME_DROP'
  | 'SPENDING_SPIKE' | 'SUBSCRIPTION_CHANGE' | 'DTI_WARNING'
  | 'GOAL_PROGRESS' | 'GOAL_COMPLETED' | 'RED_FLAG_NEW'
  | 'SYNC_COMPLETE' | 'GENERAL';

export type NotificationSeverity = 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  body: string;
  actionUrl: string | null;
  readAt: string | null;
  dismissedAt: string | null;
  metadata: string | null;
  createdAt: string;
}

export interface NotificationFeed {
  notifications: Notification[];
  unreadCount: number;
  total: number;
}

export interface NotificationPreferences {
  id: string;
  userId: string;
  inApp: boolean;
  email: boolean;
  push: boolean;
  scoreAlerts: boolean;
  incomeAlerts: boolean;
  spendAlerts: boolean;
  goalAlerts: boolean;
  quietStart: number;
  quietEnd: number;
}

export const notificationService = {
  list: (opts?: { limit?: number; offset?: number; unreadOnly?: boolean }) => {
    const params = new URLSearchParams();
    if (opts?.limit) params.set('limit', String(opts.limit));
    if (opts?.offset) params.set('offset', String(opts.offset));
    if (opts?.unreadOnly) params.set('unreadOnly', 'true');
    return api.get<NotificationFeed>(`/notifications?${params}`).then((r) => r.data);
  },
  unreadCount: () =>
    api.get<{ count: number }>('/notifications/unread-count').then((r) => r.data.count),
  markRead: (id: string) =>
    api.post(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () =>
    api.post('/notifications/read-all').then((r) => r.data),
  dismiss: (id: string) =>
    api.post(`/notifications/${id}/dismiss`).then((r) => r.data),
  getPreferences: () =>
    api.get<NotificationPreferences>('/notifications/preferences').then((r) => r.data),
  updatePreferences: (data: Partial<NotificationPreferences>) =>
    api.patch<NotificationPreferences>('/notifications/preferences', data).then((r) => r.data),
};
