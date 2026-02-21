import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { kmsClient } from '../config/gcp.js';
import { env } from '../config/env.js';

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function useCloudKms(): boolean {
  return env.NODE_ENV === 'production' && env.GCP_PROJECT_ID.length > 0;
}

function kmsKeyName(): string {
  return kmsClient.cryptoKeyPath(
    env.GCP_PROJECT_ID,
    env.KMS_LOCATION,
    env.KMS_KEY_RING,
    env.KMS_CRYPTO_KEY,
  );
}

/**
 * Encrypts plaintext and returns a base64-encoded ciphertext string.
 *
 * - **Production** (GCP KMS): delegates to Cloud KMS symmetric encrypt.
 * - **Development**: uses AES-256-GCM with `ENCRYPTION_KEY` from env.
 *   The returned string is `base64(iv + authTag + ciphertext)`.
 */
export async function encrypt(plaintext: string): Promise<string> {
  if (useCloudKms()) {
    const [result] = await kmsClient.encrypt({
      name: kmsKeyName(),
      plaintext: Buffer.from(plaintext, 'utf8'),
    });
    return Buffer.from(result.ciphertext as Uint8Array).toString('base64');
  }

  const key = deriveKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

/**
 * Decrypts a base64-encoded ciphertext previously produced by {@link encrypt}.
 *
 * - **Production** (GCP KMS): delegates to Cloud KMS symmetric decrypt.
 * - **Development**: extracts IV and auth tag, then decrypts with AES-256-GCM.
 */
export async function decrypt(ciphertext: string): Promise<string> {
  if (useCloudKms()) {
    const [result] = await kmsClient.decrypt({
      name: kmsKeyName(),
      ciphertext: Buffer.from(ciphertext, 'base64'),
    });
    return Buffer.from(result.plaintext as Uint8Array).toString('utf8');
  }

  const key = deriveKey();
  const buf = Buffer.from(ciphertext, 'base64');

  const iv = buf.subarray(0, IV_LENGTH);
  const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGO, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString('utf8');
}

function deriveKey(): Buffer {
  const raw = env.ENCRYPTION_KEY;
  if (raw.length >= 32) {
    return Buffer.from(raw.slice(0, 32), 'utf8');
  }
  return Buffer.from(raw.padEnd(32, '0'), 'utf8');
}
