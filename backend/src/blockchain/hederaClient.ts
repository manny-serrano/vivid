import { Client, PrivateKey, TopicMessageSubmitTransaction, TopicId } from '@hashgraph/sdk';
import { env } from '../config/env.js';

export { TopicMessageSubmitTransaction, TopicId };

function parsePrivateKey(raw: string): PrivateKey {
  const stripped = raw.startsWith('0x') ? raw.slice(2) : raw;
  try {
    return PrivateKey.fromStringECDSA(stripped);
  } catch {
    try {
      return PrivateKey.fromStringED25519(stripped);
    } catch {
      return PrivateKey.fromStringDer(raw);
    }
  }
}

export function createHederaClient(): Client {
  const client =
    env.HEDERA_NETWORK === 'mainnet'
      ? Client.forMainnet()
      : Client.forTestnet();

  if (env.HEDERA_ACCOUNT_ID && env.HEDERA_PRIVATE_KEY) {
    client.setOperator(env.HEDERA_ACCOUNT_ID, parsePrivateKey(env.HEDERA_PRIVATE_KEY));
  }

  return client;
}

export function getOperatorKey(): PrivateKey {
  if (!env.HEDERA_PRIVATE_KEY) {
    throw new Error('HEDERA_PRIVATE_KEY is not configured');
  }
  return parsePrivateKey(env.HEDERA_PRIVATE_KEY);
}
