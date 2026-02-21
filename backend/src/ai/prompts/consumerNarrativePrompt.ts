// ---------------------------------------------------------------------------
// Vivid – Consumer-Facing Narrative Prompts
// ---------------------------------------------------------------------------

import type { VividScores } from '../scoreCalculator.js';
import type { TransactionPatterns } from './scoringPrompt.js';

/**
 * System prompt that sets the warm, empowering, second-person tone
 * used for all consumer-facing Vivid narratives.
 */
export const CONSUMER_NARRATIVE_SYSTEM_PROMPT = `You are Vivid, an empathetic and empowering financial wellness companion.

Tone & Style Rules:
- Always address the user in the second person ("you", "your").
- Be warm, encouraging, and optimistic — but never dishonest.
- Celebrate strengths before mentioning areas for improvement.
- Use plain language; avoid jargon. If a financial term is necessary, define it in parentheses.
- Keep paragraphs short (2-3 sentences max).
- Use analogies and relatable comparisons to make numbers meaningful.
- Never shame, lecture, or use negative framing. Reframe weaknesses as opportunities.
- End with a motivating call-to-action or affirmation.
- Do NOT output raw numbers or JSON — write in flowing, conversational prose.`;

/**
 * Build the user-portion of the consumer narrative prompt.
 *
 * The resulting string is paired with {@link CONSUMER_NARRATIVE_SYSTEM_PROMPT}
 * and sent to Gemini to produce a personalised financial story.
 *
 * @param scores              - The computed Vivid pillar scores.
 * @param strengths           - Human-readable strength bullets (e.g. "Consistent payroll deposits").
 * @param improvements        - Human-readable improvement bullets (e.g. "Reduce subscription count").
 * @param transactionPatterns - High-level spending/income patterns.
 * @returns The user prompt string.
 */
export function buildConsumerNarrativePrompt(
  scores: VividScores,
  strengths: string[],
  improvements: string[],
  transactionPatterns: TransactionPatterns,
): string {
  const strengthsList = strengths.length > 0
    ? strengths.map((s) => `  • ${s}`).join('\n')
    : '  • (none identified)';

  const improvementsList = improvements.length > 0
    ? improvements.map((s) => `  • ${s}`).join('\n')
    : '  • (none identified)';

  return `Write a personalised financial narrative for a Vivid user.

## Their Vivid Scores
- Income Stability:       ${scores.incomeStability.toFixed(1)} / 100
- Spending Discipline:    ${scores.spendingDiscipline.toFixed(1)} / 100
- Debt Trajectory:        ${scores.debtTrajectory.toFixed(1)} / 100
- Financial Resilience:   ${scores.financialResilience.toFixed(1)} / 100
- Growth Momentum:        ${scores.growthMomentum.toFixed(1)} / 100
- Overall Vivid Score:    ${scores.overall.toFixed(1)} / 100

## Key Strengths
${strengthsList}

## Areas for Growth
${improvementsList}

## Spending & Income Patterns (${transactionPatterns.monthsAnalysed} months)
- Primary income: ${transactionPatterns.primaryIncomeSource}
- Top merchants: ${transactionPatterns.topMerchants.join(', ') || 'N/A'}
- Recurring charges: ${transactionPatterns.recurringCharges.join(', ') || 'None'}
- Unusual spikes: ${transactionPatterns.unusualSpikes.join(', ') || 'None'}

## Output Requirements
1. Open with a personalised greeting and their overall score framed positively.
2. Dedicate a short paragraph to each of the five pillars — lead with the strongest first.
3. Weave in the strengths naturally; don't just list them.
4. Frame improvements as "next steps" or "opportunities."
5. Close with an encouraging, forward-looking statement.
6. Keep the total length between 300-500 words.`;
}
