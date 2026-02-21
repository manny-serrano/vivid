import { z } from 'zod';

export const registerSchema = z.object({
  firebaseToken: z.string().min(1, 'Firebase token is required'),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
});

export const loginSchema = z.object({
  firebaseToken: z.string().min(1, 'Firebase token is required'),
});

export const authResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    firebaseUid: z.string(),
    email: z.string().email(),
    firstName: z.string(),
    lastName: z.string(),
    hasPlaidConnection: z.boolean(),
    hasTwin: z.boolean(),
  }),
  token: z.string(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AuthResponseInput = z.infer<typeof authResponseSchema>;
