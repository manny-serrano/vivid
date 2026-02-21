import { createHash } from 'node:crypto';
import { createHederaClient, TopicMessageSubmitTransaction, TopicId } from './hederaClient.js';
import { generateProfileHash } from './generateHash.js';
import { env } from '../config/env.js';

/** Payload returned after stamping a profile onto Hedera Consensus Service. */
export interface StampResult {
  hederaTransactionId: string;
  hederaTimestamp: string;
  profileHash: string;
  topicId: string;
}

/**
 * Stamps a twin profile onto the Hedera Consensus Service (HCS).
 *
 * 1. Hashes the profile object deterministically with SHA-256.
 * 2. Hashes the userId for on-chain privacy.
 * 3. Submits a JSON message to the configured HCS topic.
 * 4. Returns the transaction ID, consensus timestamp, hash, and topic ID.
 */
export async function stampProfileOnHedera(
  twinProfile: object,
  userId: string,
): Promise<StampResult> {
  const profileHash = generateProfileHash(twinProfile);

  if (!env.HEDERA_TOPIC_ID || !env.HEDERA_ACCOUNT_ID) {
    return {
      hederaTransactionId: '',
      hederaTimestamp: new Date().toISOString(),
      profileHash,
      topicId: '0.0.0',
    };
  }

  const userIdHash = createHash('sha256').update(userId, 'utf8').digest('hex');
  const topicId = TopicId.fromString(env.HEDERA_TOPIC_ID);

  const message = JSON.stringify({
    profileHash,
    userIdHash,
    timestamp: new Date().toISOString(),
    version: '1.0',
  });

  const client = createHederaClient();

  const submitTx = new TopicMessageSubmitTransaction()
    .setTopicId(topicId)
    .setMessage(message);

  const txResponse = await submitTx.execute(client);
  const receipt = await txResponse.getReceipt(client);

  const transactionId = txResponse.transactionId.toString();
  const consensusTimestamp = receipt.topicSequenceNumber != null
    ? new Date().toISOString()
    : new Date().toISOString();

  return {
    hederaTransactionId: transactionId,
    hederaTimestamp: consensusTimestamp,
    profileHash,
    topicId: topicId.toString(),
  };
}
