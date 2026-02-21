// ---------------------------------------------------------------------------
// Vivid – Lending Readiness Prompt
// ---------------------------------------------------------------------------

import type { VividScores } from '../scoreCalculator.js';

/**
 * Build a prompt that asks the AI to produce loan-product readiness scores
 * (0-100) for personal, auto, mortgage, and small-business loans.
 *
 * Each product maps to specific pillar weights:
 *
 * | Product        | Primary Pillars                        |
 * |----------------|----------------------------------------|
 * | Personal Loan  | Income Stability + Spending Discipline |
 * | Auto Loan      | Debt Trajectory + Income Stability     |
 * | Mortgage       | All five equally                       |
 * | Small Business | Growth Momentum + Income + Resilience  |
 *
 * @param scores - The computed Vivid pillar scores.
 * @returns A prompt string ready to be sent to Gemini.
 */
export function buildLendingReadinessPrompt(scores: VividScores): string {
  return `You are a lending-readiness assessment engine for the Vivid Financial Twin platform.

Given the applicant's five pillar scores, compute readiness scores (0-100) for four loan products. Each product relies on specific pillars as described below.

## Applicant Pillar Scores
- Income Stability:       ${scores.incomeStability.toFixed(1)}
- Spending Discipline:    ${scores.spendingDiscipline.toFixed(1)}
- Debt Trajectory:        ${scores.debtTrajectory.toFixed(1)}
- Financial Resilience:   ${scores.financialResilience.toFixed(1)}
- Growth Momentum:        ${scores.growthMomentum.toFixed(1)}
- Overall:                ${scores.overall.toFixed(1)}

## Product Scoring Rules

### Personal Loan Readiness
Weighted heavily on Income Stability (40%) and Spending Discipline (40%), with Debt Trajectory as a secondary factor (20%).
- If Income Stability < 40 OR Spending Discipline < 35, cap at 50.
- If Debt Trajectory < 30, apply a -15 penalty.

### Auto Loan Readiness
Weighted on Debt Trajectory (40%) and Income Stability (35%), with Financial Resilience (25%).
- If Debt Trajectory < 35, cap at 45.
- If Income Stability > 70 AND Debt Trajectory > 60, apply a +10 bonus.

### Mortgage Readiness
All five pillars weighted equally (20% each).
- This is the strictest product. If ANY pillar < 40, cap at 40.
- If all pillars > 60, apply a +10 bonus.
- If Financial Resilience < 50, apply a -10 penalty.

### Small Business Loan Readiness
Weighted on Growth Momentum (35%), Income Stability (35%), and Financial Resilience (30%).
- If Growth Momentum < 30, cap at 35.
- If Income Stability > 65 AND Growth Momentum > 55, apply a +15 bonus.

## Output Format
Respond with ONLY a JSON object in this exact structure:
{
  "personalLoanReadiness": {
    "score": <number 0-100>,
    "rationale": "<one sentence>"
  },
  "autoLoanReadiness": {
    "score": <number 0-100>,
    "rationale": "<one sentence>"
  },
  "mortgageReadiness": {
    "score": <number 0-100>,
    "rationale": "<one sentence>"
  },
  "smallBizReadiness": {
    "score": <number 0-100>,
    "rationale": "<one sentence>"
  }
}

Do NOT include any text outside the JSON object.`;
}
