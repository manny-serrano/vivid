import { z } from 'zod';

export const createShareTokenSchema = z.object({
  recipientEmail: z.string().email().optional(),
  recipientInstitution: z.string().max(200).optional(),
  recipientName: z.string().max(200).optional(),
  showOverallScore: z.boolean().default(true),
  showDimensionScores: z.boolean().default(true),
  showNarrative: z.boolean().default(true),
  showTimeline: z.boolean().default(false),
  showTransactions: z.boolean().default(false),
  showLendingReadiness: z.boolean().default(true),
  showBlockchainProof: z.boolean().default(true),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

export const revokeShareTokenSchema = z.object({
  tokenId: z.string().min(1),
});

export const accessShareTokenSchema = z.object({
  token: z.string().uuid(),
});

export type CreateShareTokenInput = z.infer<typeof createShareTokenSchema>;
export type RevokeShareTokenInput = z.infer<typeof revokeShareTokenSchema>;
export type AccessShareTokenInput = z.infer<typeof accessShareTokenSchema>;
