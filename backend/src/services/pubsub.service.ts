import { pubsubClient } from '../config/gcp.js';
import { env } from '../config/env.js';

interface TwinGenerationMessage {
  userId: string;
  action: 'GENERATE_TWIN';
  timestamp: string;
}

/**
 * Publishes a twin-generation job to Google Cloud Pub/Sub.
 *
 * In development mode (no `GCP_PROJECT_ID`), bypasses Pub/Sub and directly
 * invokes the twin service's `generateTwin` function for synchronous processing.
 */
export async function publishTwinGeneration(userId: string): Promise<void> {
  const message: TwinGenerationMessage = {
    userId,
    action: 'GENERATE_TWIN',
    timestamp: new Date().toISOString(),
  };

  if (env.NODE_ENV !== 'production' || !env.GCP_PROJECT_ID) {
    const { generateTwin } = await import('./twin.service.js');
    await generateTwin(userId);
    return;
  }

  const topic = pubsubClient.topic(env.PUBSUB_TOPIC_TWIN_GENERATION);
  const dataBuffer = Buffer.from(JSON.stringify(message), 'utf8');

  await topic.publishMessage({ data: dataBuffer });
}
