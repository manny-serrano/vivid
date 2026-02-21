// ---------------------------------------------------------------------------
// Vivid – Narrative Generation via Google Vertex AI (Gemini)
// ---------------------------------------------------------------------------

import { VertexAI } from '@google-cloud/vertexai';
import { env } from '../config/env.js';
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
// Vertex AI client singleton
// ---------------------------------------------------------------------------

const vertexAI = new VertexAI({
  project: env.GCP_PROJECT_ID,
  location: env.VERTEX_AI_LOCATION,
});

function getModel(systemInstruction?: string) {
  return vertexAI.getGenerativeModel({
    model: env.VERTEX_AI_MODEL,
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      maxOutputTokens: 2048,
    },
    ...(systemInstruction ? { systemInstruction } : {}),
  });
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

/**
 * Generate a warm, consumer-facing financial narrative using Gemini.
 *
 * @param scores              - The Vivid pillar scores.
 * @param transactionPatterns - Summarised spending/income patterns.
 * @returns The generated narrative as a plain-text string.
 */
export async function generateConsumerNarrative(
  scores: VividScores,
  transactionPatterns: TransactionPatterns,
): Promise<string> {
  const strengths = deriveStrengths(scores);
  const improvements = deriveImprovements(scores);

  const userPrompt = buildConsumerNarrativePrompt(
    scores,
    strengths,
    improvements,
    transactionPatterns,
  );

  const model = getModel(CONSUMER_NARRATIVE_SYSTEM_PROMPT);
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
  });

  const response = result.response;
  const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini returned an empty consumer narrative response');
  }
  return text;
}

/**
 * Generate a clinical, institution-facing underwriting narrative using Gemini.
 *
 * @param scores              - The Vivid pillar scores.
 * @param transactionPatterns - Summarised spending/income patterns.
 * @param analysisMonths      - Number of months of data analysed.
 * @returns The generated narrative as a plain-text string.
 */
export async function generateInstitutionNarrative(
  scores: VividScores,
  transactionPatterns: TransactionPatterns,
  analysisMonths: number,
): Promise<string> {
  const userPrompt = buildInstitutionNarrativePrompt(
    scores,
    transactionPatterns,
    analysisMonths,
  );

  const model = getModel(INSTITUTION_NARRATIVE_SYSTEM_PROMPT);
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
  });

  const response = result.response;
  const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini returned an empty institution narrative response');
  }
  return text;
}

/**
 * Generate per-product lending readiness scores using Gemini.
 *
 * @param scores - The Vivid pillar scores.
 * @returns Parsed readiness scores and rationales for four loan products.
 */
export async function generateLendingReadiness(
  scores: VividScores,
): Promise<LendingReadinessResult> {
  const prompt = buildLendingReadinessPrompt(scores);

  const model = getModel();
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  });

  const response = result.response;
  const raw = response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) {
    throw new Error('Gemini returned an empty lending readiness response');
  }

  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed: unknown = JSON.parse(cleaned);
  return validateLendingReadiness(parsed);
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
