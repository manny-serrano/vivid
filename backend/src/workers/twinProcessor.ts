/**
 * Pub/Sub worker: processes GENERATE_TWIN messages by running the twin pipeline
 * and updating Firestore when done. In dev, twin generation is triggered
 * synchronously from publishTwinGeneration; this worker is for production.
 */
import { env } from '../config/env.js';
import { pubsubClient } from '../config/gcp.js';
import { firestore } from '../config/firebase.js';
import { generateTwin } from '../services/twin.service.js';
import { logger } from '../utils/logger.js';

export interface TwinGenerationPayload {
  userId: string;
  action: 'GENERATE_TWIN';
  timestamp: string;
}

export async function processTwinGenerationMessage(
  message: TwinGenerationPayload,
): Promise<void> {
  const { userId } = message;
  const docRef = firestore.collection('twinStatus').doc(userId);

  try {
    await docRef.set({ status: 'processing', updatedAt: new Date().toISOString() });
    const twin = await generateTwin(userId);
    await docRef.set({
      status: 'ready',
      twinId: twin.id,
      updatedAt: new Date().toISOString(),
    });
    logger.info('Twin generation completed', { userId, twinId: twin.id });
  } catch (err) {
    logger.error('Twin generation failed', { err, userId });
    await docRef.set({
      status: 'error',
      error: err instanceof Error ? err.message : 'Unknown error',
      updatedAt: new Date().toISOString(),
    });
    throw err;
  }
}

/**
 * Subscribe to Pub/Sub and process messages (call from a long-running process in production).
 */
export function subscribeTwinWorker(): void {
  if (!env.GCP_PROJECT_ID) {
    logger.warn('GCP_PROJECT_ID not set; twin worker subscription skipped');
    return;
  }
  const subscription = pubsubClient.subscription(env.PUBSUB_SUBSCRIPTION_TWIN_WORKER);
  subscription.on('message', async (msg: { data: Buffer; ack: () => void; nack?: () => void }) => {
    try {
      const payload = JSON.parse(msg.data.toString()) as TwinGenerationPayload;
      if (payload.action === 'GENERATE_TWIN') {
        await processTwinGenerationMessage(payload);
      }
      msg.ack();
    } catch (err) {
      logger.error('Worker message handling failed', { err });
      if (typeof msg.nack === 'function') msg.nack();
    }
  });
  logger.info('Twin worker subscription active');
}
