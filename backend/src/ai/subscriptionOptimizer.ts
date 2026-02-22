// ---------------------------------------------------------------------------
// Vivid – Spend Optimizer ("Fix-It" / Optimize My Spend)
// Detects unnecessary charges: fast food, discretionary, non-essential
// recurring, and other spending that isn't needed to survive.
// ---------------------------------------------------------------------------

import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DetectedCharge {
  merchantName: string;
  monthlyAmount: number;
  frequency: number;
  lastCharge: string;
  firstSeen: string;
  monthsSinceFirst: number;
  isUnnecessary: boolean;
  unnecessaryReason: string | null;
  category: string;
  totalSpent: number;
}

export interface CancelAction {
  merchantName: string;
  monthlyAmount: number;
  annualSavings: number;
  cancelMethod: 'email' | 'url' | 'phone';
  cancelUrl: string | null;
  draftEmail: string | null;
  phoneNumber: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
  tip: string;
}

export interface OptimizationReport {
  allCharges: DetectedCharge[];
  unnecessaryCharges: DetectedCharge[];
  totalMonthlySpending: number;
  potentialMonthlySavings: number;
  potentialAnnualSavings: number;
  cancelActions: CancelAction[];
  aiSummary: string | null;
}

interface TransactionInput {
  amount: number;
  date: string;
  merchantName: string | null;
  name: string;
  vividCategory: string;
  isRecurring: boolean;
  isIncomeDeposit: boolean;
}

// ---------------------------------------------------------------------------
// Categories that are essential for survival — everything else is fair game
// ---------------------------------------------------------------------------

const ESSENTIAL_CATEGORIES = new Set([
  'rent', 'mortgage', 'utilities', 'groceries', 'medical',
  'insurance', 'transportation', 'debt_payment', 'savings_transfer',
  'childcare', 'education',
]);

const FAST_FOOD_KEYWORDS = [
  'mcdonald', 'burger king', 'wendy', 'taco bell', 'chick-fil-a',
  'popeyes', 'five guys', "arby's", 'arbys', 'sonic drive', 'jack in the box',
  'subway', 'jimmy john', 'jersey mike', 'chipotle', 'panda express',
  'kfc', 'domino', 'pizza hut', 'papa john', 'little caesars', 'wingstop',
  'raising cane', 'whataburger', 'in-n-out', 'shake shack', 'panera',
  'starbucks', 'dunkin', 'tim horton', 'dutch bros', 'caribou coffee',
  'doordash', 'uber eats', 'ubereats', 'grubhub', 'postmates',
  'seamless', 'caviar',
];

const DISCRETIONARY_KEYWORDS = [
  'gaming', 'playstation', 'xbox', 'steam', 'twitch', 'discord nitro',
  'onlyfans', 'patreon', 'gambling', 'fanduel', 'draftkings', 'betmgm',
  'casino', 'lottery',
  'vape', 'smoke shop', 'liquor', 'wine', 'beer', 'spirits',
  'nail salon', 'spa ', 'massage', 'tanning',
  'fashion nova', 'shein', 'zara', 'h&m',
];

// ---------------------------------------------------------------------------
// Known cancellation methods for common subscription services
// ---------------------------------------------------------------------------

const CANCEL_DB: Record<string, Partial<CancelAction>> = {
  'netflix': { cancelMethod: 'url', cancelUrl: 'https://www.netflix.com/cancelplan', difficulty: 'easy', tip: 'Go to Account > Cancel Membership. Takes effect at end of billing period.' },
  'spotify': { cancelMethod: 'url', cancelUrl: 'https://www.spotify.com/account/subscription/', difficulty: 'easy', tip: 'Account > Subscription > Cancel Premium. You keep access until billing date.' },
  'hulu': { cancelMethod: 'url', cancelUrl: 'https://secure.hulu.com/account', difficulty: 'easy', tip: 'Account > Cancel Subscription. You can pause instead if unsure.' },
  'disney+': { cancelMethod: 'url', cancelUrl: 'https://www.disneyplus.com/account/subscription', difficulty: 'easy', tip: 'Account > Subscription > Cancel. Takes effect at end of cycle.' },
  'hbo': { cancelMethod: 'url', cancelUrl: 'https://www.max.com/account', difficulty: 'easy', tip: 'Settings > Subscription > Cancel Subscription.' },
  'paramount': { cancelMethod: 'url', cancelUrl: 'https://www.paramountplus.com/account/', difficulty: 'easy', tip: 'Account > Cancel Subscription. Easy one-click process.' },
  'peacock': { cancelMethod: 'url', cancelUrl: 'https://www.peacocktv.com/account/plan', difficulty: 'easy', tip: 'Account > Plan > Cancel. Instant cancellation.' },
  'apple music': { cancelMethod: 'url', cancelUrl: 'https://support.apple.com/en-us/HT202039', difficulty: 'medium', tip: 'Settings > Apple ID > Subscriptions on your device.' },
  'amazon prime': { cancelMethod: 'url', cancelUrl: 'https://www.amazon.com/mc/pipelines/cancel', difficulty: 'medium', tip: 'Account > Prime Membership > End membership. Amazon will offer discounts to keep you.' },
  'youtube': { cancelMethod: 'url', cancelUrl: 'https://www.youtube.com/paid_memberships', difficulty: 'easy', tip: 'YouTube > Paid memberships > Manage > Cancel.' },
  'adobe': { cancelMethod: 'phone', phoneNumber: '1-800-833-6687', difficulty: 'hard', tip: 'Adobe charges early termination fees. Call and ask for the "retention team" to negotiate waiver.' },
  'planet fitness': { cancelMethod: 'email', difficulty: 'hard', tip: 'Most locations require in-person cancellation or a certified letter. Send a certified letter to your home club.' },
  'anytime fitness': { cancelMethod: 'email', difficulty: 'hard', tip: 'Check your contract for the cancellation clause. Usually requires 30-day written notice.' },
  'la fitness': { cancelMethod: 'email', difficulty: 'hard', tip: 'Must cancel in-person or via certified mail. Bring your contract terms.' },
  'equinox': { cancelMethod: 'email', difficulty: 'hard', tip: 'Email or visit front desk. 45-day notice required per most contracts.' },
  'microsoft 365': { cancelMethod: 'url', cancelUrl: 'https://account.microsoft.com/services/', difficulty: 'easy', tip: 'Account > Services & subscriptions > Cancel.' },
  'dropbox': { cancelMethod: 'url', cancelUrl: 'https://www.dropbox.com/account/plan', difficulty: 'easy', tip: 'Settings > Plan > Cancel plan. Reverts to free tier.' },
  'icloud': { cancelMethod: 'url', cancelUrl: 'https://support.apple.com/en-us/HT207594', difficulty: 'medium', tip: 'Settings > Apple ID > iCloud > Manage Storage > Downgrade.' },
  'notion': { cancelMethod: 'url', cancelUrl: 'https://www.notion.so/my-account', difficulty: 'easy', tip: 'Settings > Plans > Downgrade to free.' },
  'figma': { cancelMethod: 'url', cancelUrl: 'https://www.figma.com/settings', difficulty: 'easy', tip: 'Settings > Account > Plan > Downgrade.' },
  'canva': { cancelMethod: 'url', cancelUrl: 'https://www.canva.com/settings/billing', difficulty: 'easy', tip: 'Account Settings > Billing > Cancel subscription.' },
  'openai': { cancelMethod: 'url', cancelUrl: 'https://platform.openai.com/account/billing', difficulty: 'easy', tip: 'Settings > Billing > Cancel plan.' },
  'chatgpt': { cancelMethod: 'url', cancelUrl: 'https://chat.openai.com/#settings/subscription', difficulty: 'easy', tip: 'Settings > Subscription > Cancel.' },
  'doordash': { cancelMethod: 'url', cancelUrl: 'https://www.doordash.com/consumer/membership/', difficulty: 'easy', tip: 'Account > DashPass > Cancel. Delivery fees return but you keep any promo credits.' },
  'uber eats': { cancelMethod: 'url', cancelUrl: 'https://account.uber.com/spending', difficulty: 'easy', tip: 'Account > Uber One > Cancel membership.' },
  'grubhub': { cancelMethod: 'url', cancelUrl: 'https://www.grubhub.com/account/membership', difficulty: 'easy', tip: 'Account > Grubhub+ > Cancel membership.' },
  'fanduel': { cancelMethod: 'url', cancelUrl: 'https://account.fanduel.com/settings', difficulty: 'easy', tip: 'Account settings > Close account. Consider self-exclusion if needed.' },
  'draftkings': { cancelMethod: 'url', cancelUrl: 'https://www.draftkings.com/account/settings', difficulty: 'easy', tip: 'Settings > Account > Close account or set deposit limits.' },
};

// ---------------------------------------------------------------------------
// Core engine
// ---------------------------------------------------------------------------

export async function analyzeSpending(
  transactions: TransactionInput[],
  userName: string,
): Promise<OptimizationReport> {
  const nonIncome = transactions.filter((t) => !t.isIncomeDeposit);

  // --- Group by merchant for recurring detection ---
  const byMerchant = new Map<string, TransactionInput[]>();
  for (const t of nonIncome) {
    const key = (t.merchantName ?? t.name).toLowerCase().trim();
    const bucket = byMerchant.get(key) ?? [];
    bucket.push(t);
    byMerchant.set(key, bucket);
  }

  const now = new Date();
  const allCharges: DetectedCharge[] = [];

  for (const [, txs] of byMerchant) {
    const sortedDates = txs.map((t) => new Date(t.date)).sort((a, b) => a.getTime() - b.getTime());
    const amounts = txs.map((t) => Math.abs(t.amount));
    const avgAmount = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    const totalSpent = amounts.reduce((s, a) => s + a, 0);
    const firstSeen = sortedDates[0];
    const lastCharge = sortedDates[sortedDates.length - 1];
    const monthsSinceFirst = Math.max(1, Math.round((now.getTime() - firstSeen.getTime()) / (30.44 * 86400000)));

    let isUnnecessary = false;
    let unnecessaryReason: string | null = null;
    const displayName = txs[0].merchantName ?? txs[0].name;
    const nameLower = displayName.toLowerCase();
    const category = txs[0].vividCategory;

    // 1. Fast food / food delivery
    if (FAST_FOOD_KEYWORDS.some((kw) => nameLower.includes(kw))) {
      isUnnecessary = true;
      unnecessaryReason = 'Fast food or food delivery — not essential for survival. Cooking at home saves 60-80%.';
    }

    // 2. Discretionary / vice spending
    if (!isUnnecessary && DISCRETIONARY_KEYWORDS.some((kw) => nameLower.includes(kw))) {
      isUnnecessary = true;
      unnecessaryReason = 'Discretionary/luxury spending that is not needed for day-to-day survival.';
    }

    // 3. Non-essential category (dining_out, entertainment, shopping, subscriptions, etc.)
    if (!isUnnecessary && !ESSENTIAL_CATEGORIES.has(category)) {
      if (category === 'dining_out' || category === 'fast_food' || category === 'food_delivery') {
        isUnnecessary = true;
        unnecessaryReason = 'Dining out or takeout — a luxury that adds up fast. Meal prepping can cut this by 70%.';
      } else if (category === 'entertainment' || category === 'subscriptions') {
        isUnnecessary = true;
        unnecessaryReason = 'Entertainment/subscription charge — not required for survival.';
      } else if (category === 'shopping' || category === 'clothing') {
        if (txs.length >= 2 || avgAmount > 30) {
          isUnnecessary = true;
          unnecessaryReason = 'Repeated or high-value discretionary shopping — evaluate if each purchase is truly needed.';
        }
      } else if (category === 'personal_care' && avgAmount > 40) {
        isUnnecessary = true;
        unnecessaryReason = 'Personal care spending above the essentials — look for budget-friendly alternatives.';
      }
    }

    // 4. Recurring charges with price creep (any category)
    if (!isUnnecessary && txs.length >= 6 && monthsSinceFirst >= 6 && txs[0].isRecurring) {
      const recentAmount = Math.abs(txs[txs.length - 1].amount);
      const firstAmount = Math.abs(txs[0].amount);
      if (recentAmount > firstAmount * 1.15) {
        isUnnecessary = true;
        unnecessaryReason = `Price has increased ${((recentAmount / firstAmount - 1) * 100).toFixed(0)}% since you started — consider whether it's still worth it.`;
      }
    }

    allCharges.push({
      merchantName: displayName,
      monthlyAmount: Math.round((totalSpent / monthsSinceFirst) * 100) / 100,
      frequency: txs.length,
      lastCharge: lastCharge.toISOString(),
      firstSeen: firstSeen.toISOString(),
      monthsSinceFirst,
      isUnnecessary,
      unnecessaryReason,
      category,
      totalSpent: Math.round(totalSpent * 100) / 100,
    });
  }

  allCharges.sort((a, b) => b.monthlyAmount - a.monthlyAmount);

  const unnecessaryCharges = allCharges.filter((c) => c.isUnnecessary);
  const totalMonthlySpending = allCharges.reduce((s, c) => s + c.monthlyAmount, 0);
  const potentialMonthlySavings = unnecessaryCharges.reduce((s, c) => s + c.monthlyAmount, 0);
  const potentialAnnualSavings = potentialMonthlySavings * 12;

  const cancelActions = unnecessaryCharges
    .filter((c) => c.category === 'subscriptions' || c.category === 'entertainment' || CANCEL_DB[c.merchantName.toLowerCase()] != null)
    .map((c) => buildCancelAction(c, userName));

  const aiSummary = await generateOptimizationSummary(
    allCharges, unnecessaryCharges, totalMonthlySpending, potentialAnnualSavings, userName,
  );

  return {
    allCharges,
    unnecessaryCharges,
    totalMonthlySpending: Math.round(totalMonthlySpending * 100) / 100,
    potentialMonthlySavings: Math.round(potentialMonthlySavings * 100) / 100,
    potentialAnnualSavings: Math.round(potentialAnnualSavings * 100) / 100,
    cancelActions,
    aiSummary,
  };
}

// ---------------------------------------------------------------------------
// Cancel action builder (for services that can be cancelled)
// ---------------------------------------------------------------------------

function buildCancelAction(charge: DetectedCharge, userName: string): CancelAction {
  const key = charge.merchantName.toLowerCase();
  const known = Object.entries(CANCEL_DB).find(([k]) => key.includes(k));

  const base: CancelAction = {
    merchantName: charge.merchantName,
    monthlyAmount: charge.monthlyAmount,
    annualSavings: Math.round(charge.monthlyAmount * 12 * 100) / 100,
    cancelMethod: 'email',
    cancelUrl: null,
    draftEmail: null,
    phoneNumber: null,
    difficulty: 'medium',
    tip: 'Check their website for a cancellation page, or email their support team.',
  };

  if (known) {
    const [, info] = known;
    Object.assign(base, info);
  }

  base.draftEmail = generateCancelEmail(charge.merchantName, userName);
  return base;
}

function generateCancelEmail(merchantName: string, userName: string): string {
  return `Subject: Cancellation Request - ${merchantName} Subscription

Dear ${merchantName} Support Team,

I am writing to request the immediate cancellation of my subscription/membership.

Account holder: ${userName}

Please confirm the cancellation and the effective date. I also request that no further charges be made to my payment method on file.

If there are any remaining balances or refunds due, please let me know.

Thank you for your prompt attention to this matter.

Best regards,
${userName}`;
}

// ---------------------------------------------------------------------------
// Gemini-powered summary
// ---------------------------------------------------------------------------

async function generateOptimizationSummary(
  all: DetectedCharge[],
  unnecessary: DetectedCharge[],
  totalMonthly: number,
  annualSavings: number,
  userName: string,
): Promise<string | null> {
  try {
    const { VertexAI } = await import('@google-cloud/vertexai');
    const vertexAI = new VertexAI({ project: env.GCP_PROJECT_ID, location: env.VERTEX_AI_LOCATION });
    const model = vertexAI.getGenerativeModel({
      model: env.VERTEX_AI_MODEL,
      generationConfig: { temperature: 0.7, topP: 0.9, maxOutputTokens: 1024 },
      systemInstruction: `You are Vivid's spending optimization agent. You analyze a user's spending and identify unnecessary charges — fast food, food delivery, entertainment, discretionary shopping, and other non-essential spending that isn't needed to survive. Provide a concise, warm, actionable summary. Frame savings in annual terms. Don't output JSON or code.`,
    });

    const unnecessaryList = unnecessary.slice(0, 20).map((u) =>
      `- ${u.merchantName}: $${u.monthlyAmount}/mo (${u.unnecessaryReason})`
    ).join('\n');

    const prompt = `USER: ${userName}
TOTAL MONTHLY SPENDING: $${totalMonthly.toFixed(2)}
UNNECESSARY SPENDING: $${(totalMonthly > 0 ? annualSavings / 12 : 0).toFixed(2)}/mo ($${annualSavings.toFixed(2)}/yr potential savings)

UNNECESSARY CHARGES (${unnecessary.length}):
${unnecessaryList || 'None detected'}

Write a personalized 2-3 paragraph analysis that: (1) highlights the biggest unnecessary expenses (especially fast food and delivery), (2) gives specific alternatives (e.g. "meal prepping Sunday saves $X/week"), (3) frames the annual savings with a motivating example of what they could do with that money instead (emergency fund, vacation, paying down debt).`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    return result.response.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  } catch (err) {
    logger.warn('[optimizer] Vertex AI unavailable, skipping AI summary', {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
