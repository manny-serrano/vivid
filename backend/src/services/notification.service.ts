import { prisma } from '../config/database.js';
import type { Notification, NotificationType, NotificationSeverity, NotificationPreference } from '@prisma/client';
import { logger } from '../utils/logger.js';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  body: string;
  actionUrl?: string;
  metadata?: string;
}

export async function createNotification(input: CreateNotificationInput): Promise<Notification> {
  const prefs = await getOrCreatePreferences(input.userId);

  if (!prefs.inApp) return {} as Notification;

  const isQuietHour = checkQuietHours(prefs.quietStart, prefs.quietEnd);
  if (isQuietHour && input.severity !== 'CRITICAL') {
    logger.info('[notification] Suppressed during quiet hours', { userId: input.userId, type: input.type });
    return {} as Notification;
  }

  if (!shouldSendByPreference(prefs, input.type)) {
    return {} as Notification;
  }

  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      severity: input.severity,
      title: input.title,
      body: input.body,
      actionUrl: input.actionUrl,
      metadata: input.metadata,
    },
  });

  logger.info('[notification] Created', { id: notification.id, userId: input.userId, type: input.type, severity: input.severity });

  return notification;
}

export interface NotificationFeed {
  notifications: Notification[];
  unreadCount: number;
  total: number;
}

export async function getUserNotifications(
  userId: string,
  opts: { limit?: number; offset?: number; unreadOnly?: boolean } = {},
): Promise<NotificationFeed> {
  const { limit = 30, offset = 0, unreadOnly = false } = opts;

  const where = {
    userId,
    dismissedAt: null,
    ...(unreadOnly && { readAt: null }),
  };

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, readAt: null, dismissedAt: null } }),
  ]);

  return { notifications, unreadCount, total };
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, readAt: null, dismissedAt: null },
  });
}

export async function markAsRead(notificationId: string, userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { readAt: new Date() },
  });
}

export async function markAllRead(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return result.count;
}

export async function dismissNotification(notificationId: string, userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { dismissedAt: new Date() },
  });
}

export async function getOrCreatePreferences(userId: string): Promise<NotificationPreference> {
  let prefs = await prisma.notificationPreference.findUnique({ where: { userId } });
  if (!prefs) {
    prefs = await prisma.notificationPreference.create({ data: { userId } });
  }
  return prefs;
}

export async function updatePreferences(
  userId: string,
  updates: Partial<Omit<NotificationPreference, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>,
): Promise<NotificationPreference> {
  await getOrCreatePreferences(userId);
  return prisma.notificationPreference.update({
    where: { userId },
    data: updates,
  });
}

function shouldSendByPreference(prefs: NotificationPreference, type: NotificationType): boolean {
  const scoreTypes: NotificationType[] = ['SCORE_MILESTONE', 'SCORE_DROP'];
  const incomeTypes: NotificationType[] = ['INCOME_LATE', 'INCOME_DROP'];
  const spendTypes: NotificationType[] = ['SPENDING_SPIKE', 'SUBSCRIPTION_CHANGE', 'DTI_WARNING'];
  const goalTypes: NotificationType[] = ['GOAL_PROGRESS', 'GOAL_COMPLETED'];

  if (scoreTypes.includes(type)) return prefs.scoreAlerts;
  if (incomeTypes.includes(type)) return prefs.incomeAlerts;
  if (spendTypes.includes(type)) return prefs.spendAlerts;
  if (goalTypes.includes(type)) return prefs.goalAlerts;
  return true;
}

function checkQuietHours(start: number, end: number): boolean {
  const hour = new Date().getHours();
  if (start > end) {
    return hour >= start || hour < end;
  }
  return hour >= start && hour < end;
}
