import { z } from 'zod';

export const institutionTypeSchema = z.enum(['CREDIT_UNION', 'COMMUNITY_BANK', 'OTHER']);

export const registerInstitutionSchema = z.object({
  name: z.string().min(1).max(200),
  type: institutionTypeSchema,
  email: z.string().email(),
  firebaseToken: z.string().min(1),
  logoUrl: z.string().url().optional(),
});

export const institutionLoginSchema = z.object({
  firebaseToken: z.string().min(1),
});

export const viewApplicantSchema = z.object({
  token: z.string().uuid(),
});

export type RegisterInstitutionInput = z.infer<typeof registerInstitutionSchema>;
export type InstitutionLoginInput = z.infer<typeof institutionLoginSchema>;
export type ViewApplicantInput = z.infer<typeof viewApplicantSchema>;
