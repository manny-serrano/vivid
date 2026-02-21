import { prisma } from '../config/database.js';
import type { Institution, InstitutionType } from '@prisma/client';
import { accessShareToken, type ShareAccessResult } from './share.service.js';

/** Input shape for registering a new institution. */
export interface RegisterInstitutionInput {
  name: string;
  type: InstitutionType;
  email: string;
  firebaseUid: string;
  logoUrl?: string;
}

/**
 * Finds an institution by its Firebase UID.
 */
export async function getInstitution(
  firebaseUid: string,
): Promise<Institution | null> {
  return prisma.institution.findUnique({
    where: { firebaseUid },
  });
}

/**
 * Registers a new institution in the database.
 */
export async function registerInstitution(
  data: RegisterInstitutionInput,
): Promise<Institution> {
  return prisma.institution.create({
    data: {
      name: data.name,
      type: data.type,
      email: data.email,
      firebaseUid: data.firebaseUid,
      logoUrl: data.logoUrl,
    },
  });
}

/** Applicant view returned to institutions, scoped by share-token permissions. */
export interface ApplicantView {
  institutionId: string;
  shareTokenId: string;
  recipientInstitution: string | null;
  accessedAt: string;
  twinData: Record<string, unknown>;
}

/**
 * Allows an institution to view an applicant's twin through a share token.
 * Validates the token, increments access count, and returns data
 * filtered by the token's permission flags.
 *
 * @param token         - The share token string provided by the applicant.
 * @param institutionId - The institution's database ID (for audit purposes).
 */
export async function viewApplicant(
  token: string,
  institutionId: string,
): Promise<ApplicantView> {
  const result: ShareAccessResult = await accessShareToken(token);

  return {
    institutionId,
    shareTokenId: result.shareToken.id,
    recipientInstitution: result.shareToken.recipientInstitution,
    accessedAt: new Date().toISOString(),
    twinData: result.twinData,
  };
}
