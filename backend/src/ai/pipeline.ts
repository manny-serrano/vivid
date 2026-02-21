// ---------------------------------------------------------------------------
// Vivid – Financial Twin Generation Pipeline (LangChain orchestration)
// ---------------------------------------------------------------------------

import { RunnableSequence, RunnableLambda } from '@langchain/core/runnables';
import {
  categorizeTransactions,
  type PlaidTransaction,
  type EnrichedTransaction,
} from './transactionCategorizer.js';
import {
  calculateAllScores,
  type MonthlyData,
  type TransactionData,
  type VividScores,
} from './scoreCalculator.js';
import {
  generateConsumerNarrative,
  generateInstitutionNarrative,
  generateLendingReadiness,
  type LendingReadinessResult,
} from './narrativeGenerator.js';
import type { TransactionPatterns } from './prompts/scoringPrompt.js';

// ---------------------------------------------------------------------------
// Pipeline data shapes
// ---------------------------------------------------------------------------

/** Input to the twin pipeline. */
export interface PipelineInput {
  userId: string;
  transactions: PlaidTransaction[];
}

/** Complete output of the twin pipeline. */
export interface TwinData {
  userId: string;
  scores: VividScores;
  consumerNarrative: string;
  institutionNarrative: string;
  lendingReadiness: LendingReadinessResult;
  monthlyData: MonthlyData[];
  transactionPatterns: TransactionPatterns;
  enrichedTransactions: EnrichedTransaction[];
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Stage 1 – Categorise
// ---------------------------------------------------------------------------

interface CategorisedPayload {
  userId: string;
  enrichedTransactions: EnrichedTransaction[];
  raw: PlaidTransaction[];
}

function stageCategorise(input: PipelineInput): CategorisedPayload {
  const enriched = categorizeTransactions(input.transactions);
  return {
    userId: input.userId,
    enrichedTransactions: enriched,
    raw: input.transactions,
  };
}

// ---------------------------------------------------------------------------
// Stage 2 – Aggregate into monthly data
// ---------------------------------------------------------------------------

interface AggregatedPayload extends CategorisedPayload {
  monthlyData: MonthlyData[];
  transactionPatterns: TransactionPatterns;
}

const ESSENTIAL_CATEGORIES = new Set([
  'rent',
  'groceries',
  'utilities',
  'insurance',
  'medical',
  'transportation',
  'debt_payment',
]);

/**
 * Build monthly aggregates from enriched transactions.
 *
 * Groups by YYYY-MM, computes deposits, spending splits, debt, savings,
 * balance estimates, and income source counts.
 */
function stageAggregate(input: CategorisedPayload): AggregatedPayload {
  const byMonth = new Map<string, EnrichedTransaction[]>();
  for (const tx of input.enrichedTransactions) {
    const month = tx.date.slice(0, 7); // YYYY-MM
    const bucket = byMonth.get(month);
    if (bucket) {
      bucket.push(tx);
    } else {
      byMonth.set(month, [tx]);
    }
  }

  const sortedMonths = [...byMonth.keys()].sort();
  let runningBalance = 0;

  const monthlyData: MonthlyData[] = sortedMonths.map((month) => {
    const txs = byMonth.get(month)!;

    let totalDeposits = 0;
    let totalSpending = 0;
    let essentialSpending = 0;
    let discretionarySpending = 0;
    let debtPayments = 0;
    let savingsTransfers = 0;
    let overdraftCount = 0;
    let hasPayrollDeposit = false;

    const incomeSourceNames = new Set<string>();
    const subscriptionMerchants = new Set<string>();

    for (const tx of txs) {
      if (tx.isIncomeDeposit) {
        // Plaid income amounts are negative; normalise to positive
        totalDeposits += Math.abs(tx.amount);
        const src = tx.merchantName ?? tx.name;
        incomeSourceNames.add(src.toLowerCase());

        const nameLower = tx.name.toLowerCase();
        if (
          nameLower.includes('payroll') ||
          nameLower.includes('direct dep') ||
          nameLower.includes('salary')
        ) {
          hasPayrollDeposit = true;
        }
      } else {
        const absAmount = Math.abs(tx.amount);
        totalSpending += absAmount;

        if (tx.vividCategory === 'debt_payment') {
          debtPayments += absAmount;
        } else if (tx.vividCategory === 'savings_transfer') {
          savingsTransfers += absAmount;
        } else if (tx.vividCategory === 'subscriptions') {
          const key = (tx.merchantName ?? tx.name).toLowerCase();
          subscriptionMerchants.add(key);
        }

        if (ESSENTIAL_CATEGORIES.has(tx.vividCategory)) {
          essentialSpending += absAmount;
        } else {
          discretionarySpending += absAmount;
        }
      }
    }

    runningBalance += totalDeposits - totalSpending;
    if (runningBalance < 0) overdraftCount = 1;

    return {
      month,
      totalDeposits,
      totalSpending,
      essentialSpending,
      discretionarySpending,
      debtPayments,
      savingsTransfers,
      endBalance: runningBalance,
      incomeSourceCount: incomeSourceNames.size,
      overdraftCount,
      subscriptionCount: subscriptionMerchants.size,
      hasPayrollDeposit,
    };
  });

  const transactionPatterns = buildTransactionPatterns(
    input.enrichedTransactions,
    monthlyData,
  );

  return {
    ...input,
    monthlyData,
    transactionPatterns,
  };
}

// ---------------------------------------------------------------------------
// Stage 3 – Score
// ---------------------------------------------------------------------------

interface ScoredPayload extends AggregatedPayload {
  scores: VividScores;
}

function stageScore(input: AggregatedPayload): ScoredPayload {
  const transactionData: TransactionData[] = input.enrichedTransactions.map(
    (tx) => ({
      amount: tx.amount,
      date: tx.date,
      merchantName: tx.merchantName,
      vividCategory: tx.vividCategory,
      isRecurring: tx.isRecurring,
      isIncomeDeposit: tx.isIncomeDeposit,
    }),
  );

  const scores = calculateAllScores(input.monthlyData, transactionData);

  return { ...input, scores };
}

// ---------------------------------------------------------------------------
// Stage 4 – Narrative generation (async)
// ---------------------------------------------------------------------------

async function stageNarratives(input: ScoredPayload): Promise<TwinData> {
  const [consumerNarrative, institutionNarrative, lendingReadiness] =
    await Promise.all([
      generateConsumerNarrative(input.scores, input.transactionPatterns),
      generateInstitutionNarrative(
        input.scores,
        input.transactionPatterns,
        input.monthlyData.length,
      ),
      generateLendingReadiness(input.scores),
    ]);

  return {
    userId: input.userId,
    scores: input.scores,
    consumerNarrative,
    institutionNarrative,
    lendingReadiness,
    monthlyData: input.monthlyData,
    transactionPatterns: input.transactionPatterns,
    enrichedTransactions: input.enrichedTransactions,
    generatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Assembled pipeline
// ---------------------------------------------------------------------------

const categoriseStep = new RunnableLambda({ func: stageCategorise });
const aggregateStep = new RunnableLambda({ func: stageAggregate });
const scoreStep = new RunnableLambda({ func: stageScore });
const narrativeStep = new RunnableLambda({ func: stageNarratives });

const twinPipeline = RunnableSequence.from([
  categoriseStep,
  aggregateStep,
  scoreStep,
  narrativeStep,
]);

/**
 * Run the full Vivid Financial Twin pipeline.
 *
 * Orchestrates four stages:
 * 1. **Categorise** – Enrich raw Plaid transactions with Vivid categories.
 * 2. **Aggregate** – Build per-month summaries from enriched data.
 * 3. **Score** – Compute the five pillar scores + overall.
 * 4. **Narrate** – Generate consumer/institution narratives and lending readiness via Gemini.
 *
 * @param userId       - The authenticated user's ID.
 * @param transactions - Raw Plaid transaction objects.
 * @returns A complete {@link TwinData} object.
 */
export async function runTwinPipeline(
  userId: string,
  transactions: PlaidTransaction[],
): Promise<TwinData> {
  return twinPipeline.invoke({ userId, transactions });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildTransactionPatterns(
  transactions: EnrichedTransaction[],
  monthlyData: MonthlyData[],
): TransactionPatterns {
  // Top merchants by frequency
  const merchantCounts = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.merchantName && !tx.isIncomeDeposit) {
      const key = tx.merchantName;
      merchantCounts.set(key, (merchantCounts.get(key) ?? 0) + 1);
    }
  }
  const topMerchants = [...merchantCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name]) => name);

  // Recurring charges
  const recurringCharges = [
    ...new Set(
      transactions
        .filter((tx) => tx.isRecurring && !tx.isIncomeDeposit)
        .map((tx) => tx.merchantName ?? tx.name),
    ),
  ].slice(0, 15);

  // Unusual spikes: months where spending > 1.5× the average
  const avgSpending =
    monthlyData.length === 0
      ? 0
      : monthlyData.reduce((s, m) => s + m.totalSpending, 0) /
        monthlyData.length;
  const unusualSpikes = monthlyData
    .filter((m) => m.totalSpending > avgSpending * 1.5)
    .map(
      (m) =>
        `${m.month}: $${m.totalSpending.toFixed(0)} (${((m.totalSpending / avgSpending - 1) * 100).toFixed(0)}% above average)`,
    );

  // Primary income source
  const incomeSources = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.isIncomeDeposit) {
      const key = tx.merchantName ?? tx.name;
      incomeSources.set(key, (incomeSources.get(key) ?? 0) + Math.abs(tx.amount));
    }
  }
  const primaryIncomeSource =
    [...incomeSources.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
    'Unknown';

  return {
    topMerchants,
    recurringCharges,
    unusualSpikes,
    primaryIncomeSource,
    monthsAnalysed: monthlyData.length,
  };
}
