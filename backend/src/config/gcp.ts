import { KeyManagementServiceClient } from '@google-cloud/kms';
import { PubSub } from '@google-cloud/pubsub';
import { Storage } from '@google-cloud/storage';
import { env } from './env.js';

/**
 * Google Cloud KMS client for encrypting/decrypting sensitive data (e.g. Plaid tokens).
 * Uses KMS_LOCATION, KMS_KEY_RING, KMS_CRYPTO_KEY from env.
 */
export const kmsClient = new KeyManagementServiceClient();

/**
 * Google Cloud Pub/Sub client for async messaging (e.g. twin generation jobs).
 * Uses PUBSUB_TOPIC_TWIN_GENERATION and PUBSUB_SUBSCRIPTION_TWIN_WORKER from env.
 */
export const pubsubClient = new PubSub(
  env.GCP_PROJECT_ID ? { projectId: env.GCP_PROJECT_ID } : undefined
);

/**
 * Google Cloud Storage client for report artifacts.
 * Uses GCS_BUCKET_REPORTS from env.
 */
export const storageClient = new Storage(
  env.GCP_PROJECT_ID ? { projectId: env.GCP_PROJECT_ID } : undefined
);
