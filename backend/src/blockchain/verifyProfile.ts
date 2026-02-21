/** Result of a profile verification against Hedera mirror node data. */
export interface VerifyResult {
  verified: boolean;
  timestamp: string | null;
  consensusTimestamp: string | null;
}

interface MirrorMessage {
  consensus_timestamp: string;
  message: string;
  sequence_number: number;
  topic_id: string;
  payer_account_id: string;
  chunk_info: unknown;
}

interface MirrorResponse {
  messages: MirrorMessage[];
  links?: { next?: string };
}

interface HcsPayload {
  profileHash: string;
  userIdHash: string;
  timestamp: string;
  version: string;
}

/**
 * Verifies a twin profile hash against an on-chain Hedera Consensus Service message.
 *
 * Queries the Hedera testnet mirror node for messages on the given topic,
 * locates the message corresponding to the transaction, decodes its base64
 * content, and compares the stored hash to the provided `profileHash`.
 */
export async function verifyProfileOnHedera(params: {
  profileHash: string;
  hederaTransactionId: string;
  topicId: string;
}): Promise<VerifyResult> {
  const { profileHash, hederaTransactionId, topicId } = params;

  const baseUrl = `https://testnet.mirrornode.hedera.com/api/v1/topics/${topicId}/messages`;

  let nextUrl: string | null = baseUrl;

  while (nextUrl) {
    const response = await fetch(nextUrl);
    if (!response.ok) {
      throw new Error(
        `Mirror node request failed: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as MirrorResponse;

    for (const msg of data.messages) {
      const decoded = Buffer.from(msg.message, 'base64').toString('utf8');

      let payload: HcsPayload;
      try {
        payload = JSON.parse(decoded) as HcsPayload;
      } catch {
        continue;
      }

      const matchesTx = hederaTransactionId.includes(msg.payer_account_id);

      if (matchesTx && payload.profileHash === profileHash) {
        return {
          verified: true,
          timestamp: payload.timestamp,
          consensusTimestamp: msg.consensus_timestamp,
        };
      }
    }

    nextUrl = data.links?.next
      ? `https://testnet.mirrornode.hedera.com${data.links.next}`
      : null;
  }

  return {
    verified: false,
    timestamp: null,
    consensusTimestamp: null,
  };
}
