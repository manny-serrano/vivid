import type { FastifyRequest, FastifyReply } from 'fastify';
import { firebaseAuth } from '../config/firebase.js';
import {
  registerInstitution,
  getInstitution,
  viewApplicant,
} from '../services/institution.service.js';
import { registerInstitutionSchema } from '@vivid/shared';
import { prisma } from '../config/database.js';
import { BadRequestError } from '../utils/errors.js';

interface RegisterInstBody {
  name: string;
  type: string;
  email: string;
  firebaseToken: string;
  logoUrl?: string;
}

export async function registerInstitutionHandler(
  request: FastifyRequest<{ Body: RegisterInstBody }>,
  reply: FastifyReply,
): Promise<void> {
  const parsed = registerInstitutionSchema.safeParse(request.body);
  if (!parsed.success) throw new BadRequestError(parsed.error.message);

  const decoded = await firebaseAuth.verifyIdToken(parsed.data.firebaseToken);
  const { firebaseToken: _ft, ...rest } = parsed.data;
  const inst = await registerInstitution({
    ...rest,
    firebaseUid: decoded.uid,
  });
  await reply.status(201).send(inst);
}

export async function getMe(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const inst = await getInstitution(request.institution!.uid);
  if (!inst) throw new Error('Institution not found');
  await reply.send(inst);
}

interface ViewApplicantParams {
  token: string;
}

export async function viewApplicantHandler(
  request: FastifyRequest<{ Params: ViewApplicantParams }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const data = await viewApplicant(
      request.params.token,
      request.institution!.institutionId,
    );
    await reply.send(data);
  } catch {
    throw new BadRequestError('Invalid or expired share link');
  }
}
