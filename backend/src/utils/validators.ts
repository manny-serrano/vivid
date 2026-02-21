import { z } from 'zod';

export const cuidSchema = z.string().cuid();
export const uuidSchema = z.string().uuid();
export const emailSchema = z.string().email();
