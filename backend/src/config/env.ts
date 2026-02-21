import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  API_VERSION: z.string().default('v1'),
  DATABASE_URL: z.string().min(1),
  FIREBASE_PROJECT_ID: z.string().min(1),
  FIREBASE_CLIENT_EMAIL: z.string().min(1),
  FIREBASE_PRIVATE_KEY: z.string().min(1),
  GCP_PROJECT_ID: z.string().default(''),
  GCP_REGION: z.string().default('us-central1'),
  VERTEX_AI_LOCATION: z.string().default('us-central1'),
  VERTEX_AI_MODEL: z.string().default('gemini-1.5-pro'),
  KMS_KEY_RING: z.string().default('vivid-keyring'),
  KMS_CRYPTO_KEY: z.string().default('plaid-token-key'),
  KMS_LOCATION: z.string().default('global'),
  PUBSUB_TOPIC_TWIN_GENERATION: z.string().default('vivid-twin-generation'),
  PUBSUB_SUBSCRIPTION_TWIN_WORKER: z.string().default('vivid-twin-worker-sub'),
  GCS_BUCKET_REPORTS: z.string().default('vivid-twin-reports'),
  PLAID_CLIENT_ID: z.string().default(''),
  PLAID_SECRET: z.string().default(''),
  PLAID_ENV: z.enum(['sandbox', 'development', 'production']).default('sandbox'),
  PLAID_PRODUCTS: z.string().default('transactions,identity'),
  PLAID_COUNTRY_CODES: z.string().default('US'),
  HEDERA_NETWORK: z.enum(['testnet', 'mainnet']).default('testnet'),
  HEDERA_ACCOUNT_ID: z.string().default(''),
  HEDERA_PRIVATE_KEY: z.string().default(''),
  HEDERA_TOPIC_ID: z.string().default(''),
  ENCRYPTION_KEY: z.string().min(16).default('32-char-fallback-key-for-local!!'),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
