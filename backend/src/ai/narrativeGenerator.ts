// ---------------------------------------------------------------------------
// Vivid – Narrative Generation via Google Vertex AI (Gemini) with fallback
// ---------------------------------------------------------------------------

import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import type { VividScores } from './scoreCalculator.js';
import type { TransactionPatterns } from './prompts/scoringPrompt.js';
import {
  CONSUMER_NARRATIVE_SYSTEM_PROMPT,
  buildConsumerNarrativePrompt,
} from './prompts/consumerNarrativePrompt.js';
import {
  INSTITUTION_NARRATIVE_SYSTEM_PROMPT,
  buildInstitutionNarrativePrompt,
} from './prompts/institutionNarrativePrompt.js';
import { buildLendingReadinessPrompt } from './prompts/lendingReadinessPrompt.js';

// ---------------------------------------------------------------------------
// Vertex AI client (lazy, may be null if GCP auth unavailable)
// ---------------------------------------------------------------------------

let vertexModel: ReturnType<Awaited<ReturnType<typeof initVertexAI>>['getGenerativeModel']> | null = null;
let vertexAvailable: boolean | null = null;

async function initVertexAI() {
  const { VertexAI } = await import('@google-cloud/vertexai');
  return new VertexAI({ project: env.GCP_PROJECT_ID, location: env.VERTEX_AI_LOCATION });
}

async function getModel(systemInstruction?: string) {
  if (vertexAvailable === false) return null;

  try {
    const vertexAI = await initVertexAI();
    const model = vertexAI.getGenerativeModel({
      model: env.VERTEX_AI_MODEL,
      generationConfig: { temperature: 0.7, topP: 0.9, maxOutputTokens: 2048 },
      ...(systemInstruction ? { systemInstruction } : {}),
    });
    vertexAvailable = true;
    return model;
  } catch {
    vertexAvailable = false;
    return null;
  }
}

async function callGemini(systemInstruction: string | undefined, userPrompt: string): Promise<string | null> {
  try {
    const model = await getModel(systemInstruction);
    if (!model) return null;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    });
    return result.response.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  } catch (err) {
    logger.warn('[narrative] Vertex AI call failed, using template fallback', {
      error: err instanceof Error ? err.message : String(err),
    });
    vertexAvailable = false;
    return null;
  }
}

// ---------------------------------------------------------------------------
// Lending readiness response shape
// ---------------------------------------------------------------------------

/** Readiness assessment for a single loan product. */
interface LoanReadinessEntry {
  score: number;
  rationale: string;
}

/** Parsed lending-readiness response from Gemini. */
export interface LendingReadinessResult {
  personalLoanReadiness: LoanReadinessEntry;
  autoLoanReadiness: LoanReadinessEntry;
  mortgageReadiness: LoanReadinessEntry;
  smallBizReadiness: LoanReadinessEntry;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function generateConsumerNarrative(
  scores: VividScores,
  transactionPatterns: TransactionPatterns,
): Promise<string> {
  const strengths = deriveStrengths(scores);
  const improvements = deriveImprovements(scores);

  const userPrompt = buildConsumerNarrativePrompt(scores, strengths, improvements, transactionPatterns);
  const aiText = await callGemini(CONSUMER_NARRATIVE_SYSTEM_PROMPT, userPrompt);
  if (aiText) return aiText;

  return buildFallbackConsumerNarrative(scores, strengths, improvements, transactionPatterns);
}

export async function generateInstitutionNarrative(
  scores: VividScores,
  transactionPatterns: TransactionPatterns,
  analysisMonths: number,
): Promise<string> {
  const userPrompt = buildInstitutionNarrativePrompt(scores, transactionPatterns, analysisMonths);
  const aiText = await callGemini(INSTITUTION_NARRATIVE_SYSTEM_PROMPT, userPrompt);
  if (aiText) return aiText;

  return buildFallbackInstitutionNarrative(scores, transactionPatterns, analysisMonths);
}

export async function generateLendingReadiness(
  scores: VividScores,
): Promise<LendingReadinessResult> {
  const prompt = buildLendingReadinessPrompt(scores);
  const aiText = await callGemini(undefined, prompt);

  if (aiText) {
    try {
      const cleaned = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return validateLendingReadiness(JSON.parse(cleaned));
    } catch { /* fall through to deterministic */ }
  }

  return computeDeterministicLendingReadiness(scores);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function validateLendingReadiness(data: unknown): LendingReadinessResult {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Invalid lending readiness payload: expected an object');
  }

  const obj = data as Record<string, unknown>;

  function extractEntry(key: string): LoanReadinessEntry {
    const entry = obj[key];
    if (typeof entry !== 'object' || entry === null) {
      throw new Error(`Missing or invalid "${key}" in lending readiness`);
    }
    const e = entry as Record<string, unknown>;
    return {
      score: typeof e['score'] === 'number' ? e['score'] : 0,
      rationale: typeof e['rationale'] === 'string' ? e['rationale'] : '',
    };
  }

  return {
    personalLoanReadiness: extractEntry('personalLoanReadiness'),
    autoLoanReadiness: extractEntry('autoLoanReadiness'),
    mortgageReadiness: extractEntry('mortgageReadiness'),
    smallBizReadiness: extractEntry('smallBizReadiness'),
  };
}

function deriveStrengths(scores: VividScores): string[] {
  const strengths: string[] = [];
  if (scores.incomeStability >= 70)
    strengths.push('Strong, consistent income pattern');
  if (scores.spendingDiscipline >= 70)
    strengths.push('Disciplined spending habits with healthy essential-to-discretionary ratio');
  if (scores.debtTrajectory >= 70)
    strengths.push('Healthy debt trajectory with manageable DTI ratio');
  if (scores.financialResilience >= 70)
    strengths.push('Solid financial cushion and balance consistency');
  if (scores.growthMomentum >= 70)
    strengths.push('Positive savings trend and investment activity');
  if (strengths.length === 0)
    strengths.push('Building a foundation for financial growth');
  return strengths;
}

function deriveImprovements(scores: VividScores): string[] {
  const improvements: string[] = [];
  if (scores.incomeStability < 50)
    improvements.push('Diversify income sources for greater stability');
  if (scores.spendingDiscipline < 50)
    improvements.push('Review recurring subscriptions and discretionary spending');
  if (scores.debtTrajectory < 50)
    improvements.push('Focus on reducing debt-to-income ratio');
  if (scores.financialResilience < 50)
    improvements.push('Build an emergency fund covering at least 2 months of expenses');
  if (scores.growthMomentum < 50)
    improvements.push('Consider automating savings and exploring investment options');
  return improvements;
}

// ---------------------------------------------------------------------------
// Template-based fallbacks (used when Vertex AI is unavailable)
// ---------------------------------------------------------------------------

function tier(score: number): string {
  if (score >= 80) return 'excellent';
  if (score >= 65) return 'strong';
  if (score >= 50) return 'moderate';
  if (score >= 35) return 'developing';
  return 'early-stage';
}

function buildFallbackConsumerNarrative(
  scores: VividScores,
  strengths: string[],
  improvements: string[],
  patterns: TransactionPatterns,
): string {
  const overall = scores.overall;
  const pillarEntries: [string, number][] = [
    ['Income Stability', scores.incomeStability],
    ['Spending Discipline', scores.spendingDiscipline],
    ['Debt Trajectory', scores.debtTrajectory],
    ['Financial Resilience', scores.financialResilience],
    ['Growth Momentum', scores.growthMomentum],
  ];
  pillarEntries.sort((a, b) => b[1] - a[1]);

  let narrative = `Your overall Vivid Score is ${overall.toFixed(0)} out of 100 — that puts you in the ${tier(overall)} range. `;

  if (overall >= 65) {
    narrative += `This is a solid foundation that reflects real financial discipline.\n\n`;
  } else if (overall >= 45) {
    narrative += `You're building momentum, and there are clear opportunities ahead.\n\n`;
  } else {
    narrative += `Every journey starts somewhere, and the fact that you're here shows you're ready to grow.\n\n`;
  }

  for (const [name, score] of pillarEntries) {
    narrative += `Your ${name} score is ${score.toFixed(0)}/100 (${tier(score)}). `;
    if (score >= 70) {
      narrative += `This is one of your standout areas — keep doing what you're doing here.\n\n`;
    } else if (score >= 50) {
      narrative += `You're on the right track, with room to push this even higher.\n\n`;
    } else {
      narrative += `This is an area with the most opportunity for growth.\n\n`;
    }
  }

  if (strengths.length > 0) {
    narrative += `Your key strengths: ${strengths.join('; ')}.\n\n`;
  }

  if (improvements.length > 0) {
    narrative += `Next steps to consider: ${improvements.join('; ')}.\n\n`;
  }

  if (patterns.primaryIncomeSource !== 'Unknown') {
    narrative += `Based on ${patterns.monthsAnalysed} months of data, your primary income source is ${patterns.primaryIncomeSource}. `;
  }

  narrative += `You're already ahead by understanding your full financial picture — that's what Vivid is all about. Keep going!`;

  return narrative;
}

function buildFallbackInstitutionNarrative(
  scores: VividScores,
  patterns: TransactionPatterns,
  analysisMonths: number,
): string {
  const lines: string[] = [
    `VIVID FINANCIAL TWIN — INSTITUTION SUMMARY`,
    `Analysis Period: ${analysisMonths} months | Generated: ${new Date().toISOString().slice(0, 10)}`,
    ``,
    `OVERALL VIVID SCORE: ${scores.overall.toFixed(1)} / 100 (${tier(scores.overall).toUpperCase()})`,
    ``,
    `PILLAR BREAKDOWN:`,
    `  Income Stability:       ${scores.incomeStability.toFixed(1)} / 100`,
    `  Spending Discipline:    ${scores.spendingDiscipline.toFixed(1)} / 100`,
    `  Debt Trajectory:        ${scores.debtTrajectory.toFixed(1)} / 100`,
    `  Financial Resilience:   ${scores.financialResilience.toFixed(1)} / 100`,
    `  Growth Momentum:        ${scores.growthMomentum.toFixed(1)} / 100`,
    ``,
    `TRANSACTION PATTERNS:`,
    `  Primary Income Source: ${patterns.primaryIncomeSource}`,
    `  Top Merchants: ${patterns.topMerchants.slice(0, 5).join(', ') || 'N/A'}`,
    `  Recurring Charges: ${patterns.recurringCharges.length} identified`,
    `  Unusual Spending Spikes: ${patterns.unusualSpikes.length || 'None'}`,
    ``,
    `RISK ASSESSMENT:`,
  ];

  if (scores.overall >= 70) {
    lines.push(`  This applicant demonstrates strong financial behavior across multiple dimensions.`);
    lines.push(`  Recommended for standard underwriting consideration.`);
  } else if (scores.overall >= 50) {
    lines.push(`  This applicant shows moderate financial stability with identifiable areas of risk.`);
    lines.push(`  Additional documentation may strengthen the application.`);
  } else {
    lines.push(`  This applicant's financial profile indicates elevated risk in several dimensions.`);
    lines.push(`  Enhanced due diligence is recommended.`);
  }

  return lines.join('\n');
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function computeDeterministicLendingReadiness(scores: VividScores): LendingReadinessResult {
  let personal = scores.incomeStability * 0.4 + scores.spendingDiscipline * 0.4 + scores.debtTrajectory * 0.2;
  if (scores.incomeStability < 40 || scores.spendingDiscipline < 35) personal = Math.min(personal, 50);
  if (scores.debtTrajectory < 30) personal -= 15;

  let auto = scores.debtTrajectory * 0.4 + scores.incomeStability * 0.35 + scores.financialResilience * 0.25;
  if (scores.debtTrajectory < 35) auto = Math.min(auto, 45);
  if (scores.incomeStability > 70 && scores.debtTrajectory > 60) auto += 10;

  let mortgage = (scores.incomeStability + scores.spendingDiscipline + scores.debtTrajectory + scores.financialResilience + scores.growthMomentum) / 5;
  const minPillar = Math.min(scores.incomeStability, scores.spendingDiscipline, scores.debtTrajectory, scores.financialResilience, scores.growthMomentum);
  if (minPillar < 40) mortgage = Math.min(mortgage, 40);
  if (minPillar > 60) mortgage += 10;
  if (scores.financialResilience < 50) mortgage -= 10;

  let smallBiz = scores.growthMomentum * 0.35 + scores.incomeStability * 0.35 + scores.financialResilience * 0.3;
  if (scores.growthMomentum < 30) smallBiz = Math.min(smallBiz, 35);
  if (scores.incomeStability > 65 && scores.growthMomentum > 55) smallBiz += 15;

  return {
    personalLoanReadiness: {
      score: clamp(Math.round(personal), 0, 100),
      rationale: `Based on income stability (${scores.incomeStability.toFixed(0)}) and spending discipline (${scores.spendingDiscipline.toFixed(0)}) as primary factors.`,
    },
    autoLoanReadiness: {
      score: clamp(Math.round(auto), 0, 100),
      rationale: `Weighted on debt trajectory (${scores.debtTrajectory.toFixed(0)}) and income stability (${scores.incomeStability.toFixed(0)}).`,
    },
    mortgageReadiness: {
      score: clamp(Math.round(mortgage), 0, 100),
      rationale: `All five pillars weighted equally; minimum pillar score is ${minPillar.toFixed(0)}.`,
    },
    smallBizReadiness: {
      score: clamp(Math.round(smallBiz), 0, 100),
      rationale: `Driven by growth momentum (${scores.growthMomentum.toFixed(0)}) and income stability (${scores.incomeStability.toFixed(0)}).`,
    },
  };
}
