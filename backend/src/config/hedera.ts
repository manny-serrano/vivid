import {
  Client,
  PrivateKey,
  TopicCreateTransaction,
  TopicId,
} from '@hashgraph/sdk';
import { env } from './env.js';

/** Re-export for creating topics when needed. */
export { TopicCreateTransaction };

let hederaClient: Client | null = null;

/**
 * Returns a configured Hedera client singleton.
 * Uses testnet or mainnet based on HEDERA_NETWORK env var.
 * Operator is set from HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY.
 */
export function getHederaClient(): Client {
  if (!hederaClient) {
    const client =
      env.HEDERA_NETWORK === 'mainnet'
        ? Client.forMainnet()
        : Client.forTestnet();

    if (env.HEDERA_ACCOUNT_ID && env.HEDERA_PRIVATE_KEY) {
      const operatorId = env.HEDERA_ACCOUNT_ID;
      const operatorKey = PrivateKey.fromString(env.HEDERA_PRIVATE_KEY);
      client.setOperator(operatorId, operatorKey);
    }

    hederaClient = client;
  }
  return hederaClient;
}

/**
 * Returns the Hedera topic ID from env, or null if not configured.
 */
export function getTopicId(): TopicId | null {
  if (!env.HEDERA_TOPIC_ID) {
    return null;
  }
  return TopicId.fromString(env.HEDERA_TOPIC_ID);
}
