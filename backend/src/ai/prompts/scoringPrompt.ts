// ---------------------------------------------------------------------------
// Vivid – Gemini Scoring-Validation Prompt
// ---------------------------------------------------------------------------

import type { VividScores } from '../scoreCalculator.js';

/** Summarised transaction patterns fed into the prompt. */
export interface TransactionPatterns {
  topMerchants: string[];
  recurringCharges: string[];
  unusualSpikes: string[];
  primaryIncomeSource: string;
  monthsAnalysed: number;
}

/**
 * Build a structured prompt that asks Gemini to validate and optionally
 * refine the algorithmically computed Vivid scores.
 *
 * The model receives both the raw scores and observable transaction
 * patterns so it can flag statistical anomalies, suggest adjustments,
 * and provide reasoning.
 *
 * @param scores   - The five-pillar Vivid scores plus the overall.
 * @param patterns - High-level transaction patterns summarising the data.
 * @returns A prompt string ready to be sent to Gemini.
 */
export function buildScoringValidationPrompt(
  scores: VividScores,
  patterns: TransactionPatterns,
): string {
  return `You are a financial-data quality analyst working inside the Vivid Financial Twin platform.

Your task is to VALIDATE the algorithmically computed scores below and, where warranted, suggest refined values with clear reasoning.

## Computed Scores
- Income Stability:       ${scores.incomeStability.toFixed(1)}
- Spending Discipline:    ${scores.spendingDiscipline.toFixed(1)}
- Debt Trajectory:        ${scores.debtTrajectory.toFixed(1)}
- Financial Resilience:   ${scores.financialResilience.toFixed(1)}
- Growth Momentum:        ${scores.growthMomentum.toFixed(1)}
- Overall (weighted):     ${scores.overall.toFixed(1)}

## Observable Transaction Patterns (${patterns.monthsAnalysed} months)
- Primary income source: ${patterns.primaryIncomeSource}
- Top merchants: ${patterns.topMerchants.join(', ') || 'N/A'}
- Recurring charges: ${patterns.recurringCharges.join(', ') || 'None detected'}
- Unusual spending spikes: ${patterns.unusualSpikes.join(', ') || 'None detected'}

## Instructions
1. For each pillar, state whether the score is REASONABLE, GENEROUS, or CONSERVATIVE given the patterns.
2. If any score should be adjusted, provide the suggested value and a one-sentence rationale.
3. Flag any data-quality concerns (e.g., too few months, suspicious patterns).
4. Output a JSON object with the structure:
   {
     "validations": [
       { "pillar": "<name>", "verdict": "REASONABLE|GENEROUS|CONSERVATIVE", "suggestedScore": <number|null>, "rationale": "<string>" }
     ],
     "dataQualityConcerns": ["<string>"],
     "overallConfidence": "<HIGH|MEDIUM|LOW>"
   }

Respond ONLY with the JSON object, no additional text.`;
}
