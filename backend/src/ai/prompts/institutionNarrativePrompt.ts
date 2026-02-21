// ---------------------------------------------------------------------------
// Vivid – Institution / Lender Narrative Prompts
// ---------------------------------------------------------------------------

import type { VividScores } from '../scoreCalculator.js';
import type { TransactionPatterns } from './scoringPrompt.js';

/**
 * System prompt that sets the clinical, professional tone used for
 * institution-facing Vivid reports.
 */
export const INSTITUTION_NARRATIVE_SYSTEM_PROMPT = `You are a financial analytics engine producing underwriting-grade applicant summaries for lending institutions.

Tone & Style Rules:
- Use formal, clinical, third-person language ("The applicant", "This individual").
- Be precise and quantitative — cite scores, ratios, and percentages.
- Use standard underwriting terminology where appropriate.
- Present both strengths and risk factors objectively.
- Never use marketing language, emotional appeals, or superlatives.
- Structure the output using the exact section headings provided.
- Each section should be 2-4 sentences of dense, factual analysis.
- Flag any data-quality limitations explicitly.`;

/**
 * Build the user-portion of the institution narrative prompt.
 *
 * The resulting string is paired with {@link INSTITUTION_NARRATIVE_SYSTEM_PROMPT}
 * and sent to Gemini to produce a professional underwriting summary.
 *
 * @param scores              - The computed Vivid pillar scores.
 * @param transactionPatterns - High-level spending/income patterns.
 * @param analysisMonths      - Number of months of transaction history analysed.
 * @returns The user prompt string.
 */
export function buildInstitutionNarrativePrompt(
  scores: VividScores,
  transactionPatterns: TransactionPatterns,
  analysisMonths: number,
): string {
  return `Generate a structured applicant financial summary using the data below.

## Vivid Pillar Scores
| Pillar               | Score |
|----------------------|-------|
| Income Stability     | ${scores.incomeStability.toFixed(1)} |
| Spending Discipline  | ${scores.spendingDiscipline.toFixed(1)} |
| Debt Trajectory      | ${scores.debtTrajectory.toFixed(1)} |
| Financial Resilience | ${scores.financialResilience.toFixed(1)} |
| Growth Momentum      | ${scores.growthMomentum.toFixed(1)} |
| **Overall**          | **${scores.overall.toFixed(1)}** |

## Transaction Pattern Data (${analysisMonths} months)
- Primary income source: ${transactionPatterns.primaryIncomeSource}
- Top merchants by volume: ${transactionPatterns.topMerchants.join(', ') || 'N/A'}
- Recurring obligations: ${transactionPatterns.recurringCharges.join(', ') || 'None detected'}
- Anomalous spending events: ${transactionPatterns.unusualSpikes.join(', ') || 'None detected'}

## Required Output Format (use these EXACT headings)

### APPLICANT FINANCIAL SUMMARY
One-paragraph executive summary of the applicant's overall financial profile.

### Assessment Date
Today's date in ISO 8601 format.

### Analysis Period
State the number of months and date range.

### INCOME ASSESSMENT
Evaluate income stability, source diversity, and regularity. Reference the Income Stability score.

### SPENDING BEHAVIOR
Analyse essential-vs-discretionary balance, subscription load, and overdraft history. Reference the Spending Discipline score.

### DEBT POSTURE
Assess debt-to-income trajectory, payment consistency, and DTI trend direction. Reference the Debt Trajectory score.

### RISK FACTORS
Enumerate specific risk factors identified from scores and patterns (bullet list).

### RECOMMENDED LOAN PRODUCTS
Based on the score profile, list 1-3 product categories (e.g., personal, auto, mortgage) the applicant is best suited for, with brief justification.

### LENDING RECOMMENDATION
Provide a final recommendation: APPROVE, CONDITIONAL APPROVE, or DECLINE, with a 2-3 sentence rationale.`;
}
