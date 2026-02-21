import type { FastifyRequest, FastifyReply } from 'fastify';
import { firebaseAuth } from '../config/firebase.js';
import { prisma } from '../config/database.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';

export interface InstitutionContext {
  uid: string;
  email: string;
  institutionId: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    institution?: InstitutionContext;
  }
}

/**
 * PreHandler for institution routes: verify Firebase token and load institution by firebaseUid.
 */
export async function institutionAuthPreHandler(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid Authorization header');
  }
  const token = authHeader.slice(7);
  try {
    const decoded = await firebaseAuth.verifyIdToken(token);
    const institution = await prisma.institution.findUnique({
      where: { firebaseUid: decoded.uid },
    });
    if (!institution) {
      throw new ForbiddenError('Not registered as an institution');
    }
    request.institution = {
      uid: decoded.uid,
      email: decoded.email ?? '',
      institutionId: institution.id,
    };
  } catch (e) {
    if (e instanceof ForbiddenError) throw e;
    throw new UnauthorizedError('Invalid or expired token');
  }
}
