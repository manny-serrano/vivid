import { Client, PrivateKey, TopicMessageSubmitTransaction, TopicId } from '@hashgraph/sdk';
import { env } from '../config/env.js';

export { TopicMessageSubmitTransaction, TopicId };

/**
 * Creates and returns a configured Hedera client for the network specified
 * in `HEDERA_NETWORK`. The operator account is set from env vars.
 */
export function createHederaClient(): Client {
  const client =
    env.HEDERA_NETWORK === 'mainnet'
      ? Client.forMainnet()
      : Client.forTestnet();

  if (env.HEDERA_ACCOUNT_ID && env.HEDERA_PRIVATE_KEY) {
    client.setOperator(
      env.HEDERA_ACCOUNT_ID,
      PrivateKey.fromString(env.HEDERA_PRIVATE_KEY),
    );
  }

  return client;
}

/**
 * Returns the operator's private key parsed from the `HEDERA_PRIVATE_KEY` env var.
 */
export function getOperatorKey(): PrivateKey {
  if (!env.HEDERA_PRIVATE_KEY) {
    throw new Error('HEDERA_PRIVATE_KEY is not configured');
  }
  return PrivateKey.fromString(env.HEDERA_PRIVATE_KEY);
}
