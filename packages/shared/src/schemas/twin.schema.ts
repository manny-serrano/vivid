import { z } from 'zod';

export const twinScoresSchema = z.object({
  incomeStabilityScore: z.number().min(0).max(100),
  spendingDisciplineScore: z.number().min(0).max(100),
  debtTrajectoryScore: z.number().min(0).max(100),
  financialResilienceScore: z.number().min(0).max(100),
  growthMomentumScore: z.number().min(0).max(100),
  overallScore: z.number().min(0).max(100),
});

export const lendingReadinessSchema = z.object({
  personalLoanReadiness: z.number().min(0).max(100),
  autoLoanReadiness: z.number().min(0).max(100),
  mortgageReadiness: z.number().min(0).max(100),
  smallBizReadiness: z.number().min(0).max(100),
});

export const twinProfileSchema = twinScoresSchema.merge(lendingReadinessSchema).extend({
  id: z.string(),
  userId: z.string(),
  consumerNarrative: z.string(),
  institutionNarrative: z.string(),
  profileHash: z.string(),
  hederaTopicId: z.string(),
  hederaTransactionId: z.string().nullable(),
  hederaTimestamp: z.string().nullable(),
  blockchainVerified: z.boolean(),
  generatedAt: z.string(),
  updatedAt: z.string(),
  transactionCount: z.number().int().min(0),
  analysisMonths: z.number().int().min(0),
});

export const twinGenerationRequestSchema = z.object({
  userId: z.string().min(1),
});

export type TwinScoresInput = z.infer<typeof twinScoresSchema>;
export type LendingReadinessInput = z.infer<typeof lendingReadinessSchema>;
export type TwinProfileInput = z.infer<typeof twinProfileSchema>;
