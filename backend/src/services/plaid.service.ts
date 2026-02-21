import {
  CountryCode,
  Products,
  type LinkTokenCreateRequest,
  type TransactionsGetRequest,
  type TransactionsGetResponse,
  type AccountBase,
  type Transaction,
} from 'plaid';
import { plaidClient, getPlaidProducts } from '../config/plaid.js';
import { env } from '../config/env.js';

/**
 * Creates a Plaid Link token for the given user so the frontend
 * can launch the Plaid Link flow.
 *
 * @returns The `link_token` string and its `expiration` timestamp.
 */
export async function createLinkToken(
  userId: string,
): Promise<{ linkToken: string; expiration: string }> {
  const products = getPlaidProducts().map((p) => p as Products);
  const countryCodes = env.PLAID_COUNTRY_CODES
    .split(',')
    .map((c) => c.trim() as CountryCode);

  const request: LinkTokenCreateRequest = {
    user: { client_user_id: userId },
    client_name: 'Vivid',
    products,
    country_codes: countryCodes,
    language: 'en',
  };

  const response = await plaidClient.linkTokenCreate(request);

  return {
    linkToken: response.data.link_token,
    expiration: response.data.expiration,
  };
}

/**
 * Exchanges a public token obtained from Plaid Link for a permanent
 * access token and the associated item ID.
 */
export async function exchangePublicToken(
  publicToken: string,
): Promise<{ accessToken: string; itemId: string }> {
  const response = await plaidClient.itemPublicTokenExchange({
    public_token: publicToken,
  });

  return {
    accessToken: response.data.access_token,
    itemId: response.data.item_id,
  };
}

/**
 * Fetches all transactions for the given access token within the date range.
 * Automatically handles Plaid's pagination to return every transaction.
 *
 * @param accessToken - Plaid access token for the item.
 * @param startDate   - Start of the date range (YYYY-MM-DD).
 * @param endDate     - End of the date range (YYYY-MM-DD).
 */
export async function getTransactions(
  accessToken: string,
  startDate: string,
  endDate: string,
): Promise<Transaction[]> {
  const allTransactions: Transaction[] = [];
  let hasMore = true;
  let offset = 0;
  const count = 500;

  while (hasMore) {
    const request: TransactionsGetRequest = {
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate,
      options: { count, offset },
    };

    const response: { data: TransactionsGetResponse } =
      await plaidClient.transactionsGet(request);

    allTransactions.push(...response.data.transactions);
    offset += response.data.transactions.length;
    hasMore = allTransactions.length < response.data.total_transactions;
  }

  return allTransactions;
}

/**
 * Retrieves all accounts linked to the given Plaid access token.
 */
export async function getAccounts(
  accessToken: string,
): Promise<AccountBase[]> {
  const response = await plaidClient.accountsGet({
    access_token: accessToken,
  });

  return response.data.accounts;
}
