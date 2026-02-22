import { prisma } from '../config/database.js';
import type { SyncStatus } from '@prisma/client';
import { logger } from '../utils/logger.js';

export interface SyncLogInput {
  userId: string;
  itemId: string;
  webhookType: string;
  webhookCode: string;
  newCount?: number;
  removedCount?: number;
}

export async function createSyncLog(input: SyncLogInput): Promise<string> {
  const log = await prisma.plaidSyncLog.create({
    data: {
      userId: input.userId,
      itemId: input.itemId,
      webhookType: input.webhookType,
      webhookCode: input.webhookCode,
      newCount: input.newCount ?? 0,
      removedCount: input.removedCount ?? 0,
      status: 'RECEIVED',
    },
  });
  return log.id;
}

export async function updateSyncStatus(
  logId: string,
  status: SyncStatus,
  errorMessage?: string,
): Promise<void> {
  await prisma.plaidSyncLog.update({
    where: { id: logId },
    data: {
      status,
      ...(errorMessage && { errorMessage }),
      ...(status === 'COMPLETED' || status === 'FAILED' ? { processedAt: new Date() } : {}),
    },
  });
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

export async function getSyncDashboard(userId: string): Promise<SyncDashboard> {
  const logs = await prisma.plaidSyncLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const totalSyncs = logs.length;
  const successfulSyncs = logs.filter((l) => l.status === 'COMPLETED').length;
  const failedSyncs = logs.filter((l) => l.status === 'FAILED').length;
  const transactionsIngested = logs.reduce((sum, l) => sum + l.newCount, 0);
  const lastLog = logs[0];

  let syncHealth: 'healthy' | 'degraded' | 'offline' = 'offline';
  if (lastLog) {
    const hoursSince = (Date.now() - lastLog.createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursSince < 48 && lastLog.status !== 'FAILED') syncHealth = 'healthy';
    else if (hoursSince < 168) syncHealth = 'degraded';
  }

  const nextExpectedSync = lastLog
    ? new Date(lastLog.createdAt.getTime() + 24 * 60 * 60 * 1000).toISOString()
    : null;

  return {
    lastSyncAt: lastLog?.processedAt?.toISOString() ?? lastLog?.createdAt.toISOString() ?? null,
    totalSyncs,
    successfulSyncs,
    failedSyncs,
    transactionsIngested,
    recentLogs: logs.slice(0, 20).map((l) => ({
      id: l.id,
      webhookType: l.webhookType,
      webhookCode: l.webhookCode,
      newCount: l.newCount,
      removedCount: l.removedCount,
      status: l.status,
      errorMessage: l.errorMessage,
      processedAt: l.processedAt?.toISOString() ?? null,
      createdAt: l.createdAt.toISOString(),
    })),
    syncHealth,
    nextExpectedSync,
  };
}

export async function triggerManualSync(userId: string): Promise<{ success: boolean; message: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.encryptedPlaidToken) {
    return { success: false, message: 'No Plaid connection found' };
  }

  try {
    const { publishTwinGeneration } = await import('./pubsub.service.js');
    const logId = await createSyncLog({
      userId,
      itemId: user.plaidItemId ?? 'manual',
      webhookType: 'MANUAL',
      webhookCode: 'USER_TRIGGERED',
    });

    await updateSyncStatus(logId, 'PROCESSING');

    try {
      await publishTwinGeneration(userId);
      await updateSyncStatus(logId, 'COMPLETED');
      return { success: true, message: 'Sync completed — twin regenerated with latest data' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      await updateSyncStatus(logId, 'FAILED', msg);
      logger.error('[sync] Manual sync failed', { userId, error: msg });
      return { success: false, message: `Sync failed: ${msg}` };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, message: msg };
  }
}
