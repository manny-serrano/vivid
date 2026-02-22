import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';
import { publishTwinGeneration } from '../services/pubsub.service.js';
import { createSyncLog, updateSyncStatus } from '../services/sync.service.js';
import { logger } from '../utils/logger.js';

interface PlaidWebhookBody {
  webhook_type: string;
  webhook_code: string;
  item_id: string;
  new_transactions?: number;
  removed_transactions?: string[];
  error?: unknown;
}

const TRANSACTION_CODES_THAT_TRIGGER_REFRESH = new Set([
  'SYNC_UPDATES_AVAILABLE',
  'DEFAULT_UPDATE',
  'INITIAL_UPDATE',
  'HISTORICAL_UPDATE',
  'TRANSACTIONS_REMOVED',
]);

export async function handlePlaidWebhook(
  request: FastifyRequest<{ Body: PlaidWebhookBody }>,
  reply: FastifyReply,
): Promise<void> {
  const { webhook_type, webhook_code, item_id } = request.body ?? {};

  logger.info('[plaid-webhook] Received', { webhook_type, webhook_code, item_id });

  if (webhook_type !== 'TRANSACTIONS') {
    await reply.send({ received: true });
    return;
  }

  if (!TRANSACTION_CODES_THAT_TRIGGER_REFRESH.has(webhook_code)) {
    await reply.send({ received: true });
    return;
  }

  const user = await prisma.user.findFirst({
    where: { plaidItemId: item_id },
  });

  if (!user) {
    logger.warn('[plaid-webhook] No user found for item_id', { item_id });
    await reply.send({ received: true });
    return;
  }

  const logId = await createSyncLog({
    userId: user.id,
    itemId: item_id,
    webhookType: webhook_type,
    webhookCode: webhook_code,
    newCount: request.body.new_transactions ?? 0,
    removedCount: request.body.removed_transactions?.length ?? 0,
  });

  logger.info('[plaid-webhook] Triggering twin regeneration', {
    userId: user.id,
    webhook_code,
    newTransactions: request.body.new_transactions,
  });

  await updateSyncStatus(logId, 'PROCESSING');

  try {
    await publishTwinGeneration(user.id);
    await updateSyncStatus(logId, 'COMPLETED');
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    await updateSyncStatus(logId, 'FAILED', msg);
    logger.error('[plaid-webhook] Twin regeneration failed', { userId: user.id, error: msg });
  }

  await reply.send({ received: true, regenerating: true });
}
