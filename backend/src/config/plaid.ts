import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
} from 'plaid';
import { env } from './env.js';

/** Maps PLAID_ENV to Plaid base path. Development uses sandbox when development env is unavailable. */
function getPlaidBasePath(): string {
  switch (env.PLAID_ENV) {
    case 'production':
      return PlaidEnvironments.production;
    case 'development': {
      const envs = PlaidEnvironments as Record<string, string>;
      return envs.development ?? PlaidEnvironments.sandbox;
    }
    case 'sandbox':
    default:
      return PlaidEnvironments.sandbox;
  }
}

const configuration = new Configuration({
  basePath: getPlaidBasePath(),
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': env.PLAID_CLIENT_ID,
      'PLAID-SECRET': env.PLAID_SECRET,
    },
  },
});

/** Plaid API client for linking accounts and fetching transactions/identity. */
export const plaidClient = new PlaidApi(configuration);

/**
 * Returns Plaid products as an array (e.g. ['transactions', 'identity']).
 */
export function getPlaidProducts(): string[] {
  return env.PLAID_PRODUCTS.split(',').map((p) => p.trim()).filter(Boolean);
}
