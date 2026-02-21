// ---------------------------------------------------------------------------
// Vivid – Transaction Categoriser (Plaid → Vivid taxonomy)
// ---------------------------------------------------------------------------

/** Vivid's canonical spending/income categories. */
export type VividCategory =
  | 'rent'
  | 'groceries'
  | 'utilities'
  | 'insurance'
  | 'medical'
  | 'dining'
  | 'entertainment'
  | 'shopping'
  | 'subscriptions'
  | 'income'
  | 'savings_transfer'
  | 'debt_payment'
  | 'investment'
  | 'transportation'
  | 'other';

/** A raw transaction as returned by the Plaid API. */
export interface PlaidTransaction {
  transaction_id: string;
  account_id: string;
  amount: number;
  date: string;
  name: string;
  merchant_name: string | null;
  category: string[] | null;
  payment_channel: string;
  pending: boolean;
}

/** An enriched transaction with Vivid-specific metadata. */
export interface EnrichedTransaction {
  transactionId: string;
  accountId: string;
  amount: number;
  date: string;
  name: string;
  merchantName: string | null;
  vividCategory: VividCategory;
  isRecurring: boolean;
  isIncomeDeposit: boolean;
  isBusinessExpense: boolean;
  confidenceScore: number;
}

// ---------------------------------------------------------------------------
// Category mapping tables
// ---------------------------------------------------------------------------

const PLAID_TO_VIVID: ReadonlyMap<string, VividCategory> = new Map([
  // Housing
  ['rent', 'rent'],
  ['mortgage', 'rent'],
  ['real estate', 'rent'],

  // Food & drink
  ['groceries', 'groceries'],
  ['supermarkets and groceries', 'groceries'],
  ['food and drink', 'dining'],
  ['restaurants', 'dining'],
  ['coffee shop', 'dining'],
  ['fast food', 'dining'],

  // Utilities
  ['utilities', 'utilities'],
  ['electric', 'utilities'],
  ['gas', 'utilities'],
  ['water', 'utilities'],
  ['internet', 'utilities'],
  ['phone', 'utilities'],
  ['telecommunication services', 'utilities'],

  // Insurance
  ['insurance', 'insurance'],

  // Medical
  ['healthcare', 'medical'],
  ['medical', 'medical'],
  ['pharmacies', 'medical'],
  ['physician', 'medical'],

  // Entertainment
  ['entertainment', 'entertainment'],
  ['recreation', 'entertainment'],
  ['arts and entertainment', 'entertainment'],
  ['music', 'entertainment'],
  ['movies', 'entertainment'],
  ['gyms and fitness centers', 'entertainment'],

  // Shopping
  ['shops', 'shopping'],
  ['clothing', 'shopping'],
  ['electronics', 'shopping'],
  ['department stores', 'shopping'],
  ['discount stores', 'shopping'],
  ['digital purchase', 'shopping'],

  // Subscriptions
  ['subscription', 'subscriptions'],
  ['streaming', 'subscriptions'],

  // Savings & investment
  ['transfer', 'savings_transfer'],
  ['savings', 'savings_transfer'],
  ['investment', 'investment'],
  ['brokerage', 'investment'],
  ['financial planning and investments', 'investment'],

  // Debt
  ['loan', 'debt_payment'],
  ['credit card', 'debt_payment'],
  ['student loan', 'debt_payment'],
  ['loans and mortgages', 'debt_payment'],

  // Transportation
  ['transportation', 'transportation'],
  ['taxi', 'transportation'],
  ['gas stations', 'transportation'],
  ['parking', 'transportation'],
  ['car service', 'transportation'],
  ['airlines and aviation services', 'transportation'],

  // Income
  ['income', 'income'],
  ['payroll', 'income'],
  ['deposit', 'income'],
  ['interest', 'income'],
  ['interest earned', 'income'],
]);

const MERCHANT_OVERRIDES: ReadonlyMap<string, VividCategory> = new Map([
  // Subscriptions
  ['netflix', 'subscriptions'],
  ['spotify', 'subscriptions'],
  ['hulu', 'subscriptions'],
  ['disney+', 'subscriptions'],
  ['apple music', 'subscriptions'],
  ['amazon prime', 'subscriptions'],
  ['youtube premium', 'subscriptions'],
  ['hbo max', 'subscriptions'],
  ['paramount+', 'subscriptions'],
  ['adobe', 'subscriptions'],

  // Groceries
  ['walmart', 'groceries'],
  ['target', 'groceries'],
  ['costco', 'groceries'],
  ['whole foods', 'groceries'],
  ['trader joe', 'groceries'],
  ['kroger', 'groceries'],
  ['aldi', 'groceries'],
  ['publix', 'groceries'],
  ['safeway', 'groceries'],

  // Dining
  ['starbucks', 'dining'],
  ['mcdonald', 'dining'],
  ['chipotle', 'dining'],
  ['chick-fil-a', 'dining'],
  ['dunkin', 'dining'],
  ['uber eats', 'dining'],
  ['doordash', 'dining'],
  ['grubhub', 'dining'],

  // Transportation
  ['uber', 'transportation'],
  ['lyft', 'transportation'],
  ['shell', 'transportation'],
  ['chevron', 'transportation'],
  ['exxon', 'transportation'],
  ['bp', 'transportation'],

  // Investment
  ['robinhood', 'investment'],
  ['fidelity', 'investment'],
  ['vanguard', 'investment'],
  ['charles schwab', 'investment'],
  ['etrade', 'investment'],
  ['coinbase', 'investment'],
  ['wealthfront', 'investment'],
  ['betterment', 'investment'],

  // Rent
  ['zelle rent', 'rent'],
  ['venmo rent', 'rent'],
]);

const INCOME_KEYWORDS = [
  'payroll',
  'direct dep',
  'direct deposit',
  'salary',
  'wage',
  'ach deposit',
  'paycheck',
  'employer',
  'income',
  'tax refund',
  'irs treas',
  'unemployment',
  'social security',
  'pension',
  'retirement',
  'dividend',
  'interest earned',
];

const BUSINESS_KEYWORDS = [
  'office supplies',
  'business',
  'saas',
  'software',
  'advertising',
  'marketing',
  'aws',
  'google cloud',
  'azure',
  'hosting',
  'domain',
  'squarespace',
  'shopify',
  'stripe fee',
  'paypal fee',
  'coworking',
  'wework',
];

// ---------------------------------------------------------------------------
// Categorisation engine
// ---------------------------------------------------------------------------

/**
 * Categorise and enrich an array of raw Plaid transactions.
 *
 * For each transaction the function determines:
 * - `vividCategory` via Plaid category mapping, merchant overrides, and keyword heuristics.
 * - `isRecurring` via merchant-frequency analysis across the full transaction set.
 * - `isIncomeDeposit` via amount sign and income keyword detection.
 * - `isBusinessExpense` via business keyword matching.
 * - `confidenceScore` representing categorisation confidence (0.0 – 1.0).
 *
 * @param transactions - Raw Plaid transaction objects.
 * @returns Enriched transactions with Vivid metadata.
 */
export function categorizeTransactions(
  transactions: PlaidTransaction[],
): EnrichedTransaction[] {
  const merchantFrequency = buildMerchantFrequency(transactions);

  return transactions.map((tx) => {
    const { category, confidence } = resolveCategory(tx);
    const recurring = detectRecurring(tx, merchantFrequency);
    const isIncome = detectIncome(tx);
    const isBusiness = detectBusinessExpense(tx);

    const finalCategory: VividCategory = isIncome && category === 'other'
      ? 'income'
      : category;

    return {
      transactionId: tx.transaction_id,
      accountId: tx.account_id,
      amount: tx.amount,
      date: tx.date,
      name: tx.name,
      merchantName: tx.merchant_name,
      vividCategory: finalCategory,
      isRecurring: recurring,
      isIncomeDeposit: isIncome,
      isBusinessExpense: isBusiness,
      confidenceScore: confidence,
    };
  });
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function normalizeName(name: string): string {
  return name.toLowerCase().trim();
}

function resolveCategory(
  tx: PlaidTransaction,
): { category: VividCategory; confidence: number } {
  // 1. Merchant override (highest confidence)
  if (tx.merchant_name) {
    const merchantKey = normalizeName(tx.merchant_name);
    for (const [keyword, cat] of MERCHANT_OVERRIDES) {
      if (merchantKey.includes(keyword)) {
        return { category: cat, confidence: 0.95 };
      }
    }
  }

  // 2. Transaction name keyword match against merchant overrides
  const nameKey = normalizeName(tx.name);
  for (const [keyword, cat] of MERCHANT_OVERRIDES) {
    if (nameKey.includes(keyword)) {
      return { category: cat, confidence: 0.85 };
    }
  }

  // 3. Plaid category hierarchy
  if (tx.category && tx.category.length > 0) {
    // Try most specific (last) to least specific (first)
    for (let i = tx.category.length - 1; i >= 0; i--) {
      const plaidCat = normalizeName(tx.category[i]);
      const mapped = PLAID_TO_VIVID.get(plaidCat);
      if (mapped) {
        return { category: mapped, confidence: 0.8 - i * 0.05 };
      }
    }

    // Partial match on Plaid categories
    for (const plaidCat of tx.category) {
      const lower = normalizeName(plaidCat);
      for (const [key, cat] of PLAID_TO_VIVID) {
        if (lower.includes(key) || key.includes(lower)) {
          return { category: cat, confidence: 0.65 };
        }
      }
    }
  }

  // 4. Keyword scan on transaction name
  for (const [key, cat] of PLAID_TO_VIVID) {
    if (nameKey.includes(key)) {
      return { category: cat, confidence: 0.55 };
    }
  }

  // 5. Negative amounts in Plaid typically represent income/credits
  if (tx.amount < 0) {
    return { category: 'income', confidence: 0.5 };
  }

  return { category: 'other', confidence: 0.3 };
}

function buildMerchantFrequency(
  transactions: PlaidTransaction[],
): Map<string, number> {
  const freq = new Map<string, number>();
  for (const tx of transactions) {
    const key = tx.merchant_name
      ? normalizeName(tx.merchant_name)
      : normalizeName(tx.name);
    freq.set(key, (freq.get(key) ?? 0) + 1);
  }
  return freq;
}

function detectRecurring(
  tx: PlaidTransaction,
  merchantFrequency: Map<string, number>,
): boolean {
  const key = tx.merchant_name
    ? normalizeName(tx.merchant_name)
    : normalizeName(tx.name);

  // A merchant appearing 3+ times is treated as recurring
  const count = merchantFrequency.get(key) ?? 0;
  return count >= 3;
}

function detectIncome(tx: PlaidTransaction): boolean {
  // Plaid: negative amounts are credits (income) for depository accounts
  if (tx.amount < 0) return true;

  const nameLower = normalizeName(tx.name);
  if (INCOME_KEYWORDS.some((kw) => nameLower.includes(kw))) return true;

  if (tx.category) {
    const catLower = tx.category.map(normalizeName);
    if (
      catLower.some(
        (c) =>
          c.includes('payroll') ||
          c.includes('income') ||
          c.includes('deposit'),
      )
    ) {
      return true;
    }
  }

  return false;
}

function detectBusinessExpense(tx: PlaidTransaction): boolean {
  const nameLower = normalizeName(tx.name);
  if (BUSINESS_KEYWORDS.some((kw) => nameLower.includes(kw))) return true;

  if (tx.merchant_name) {
    const merchantLower = normalizeName(tx.merchant_name);
    if (BUSINESS_KEYWORDS.some((kw) => merchantLower.includes(kw)))
      return true;
  }

  if (tx.category) {
    const catLower = tx.category.map(normalizeName);
    if (catLower.some((c) => c.includes('business') || c.includes('office')))
      return true;
  }

  return false;
}
