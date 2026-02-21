import type { FastifyRequest, FastifyReply } from 'fastify';
import { firebaseAuth } from '../config/firebase.js';
import { UnauthorizedError } from '../utils/errors.js';

export interface AuthenticatedUser {
  uid: string;
  email: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

/**
 * PreHandler that verifies Firebase ID token and attaches decoded user to request.
 */
export async function authPreHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid Authorization header');
  }
  const token = authHeader.slice(7);
  try {
    const decoded = await firebaseAuth.verifyIdToken(token);
    request.user = {
      uid: decoded.uid,
      email: decoded.email ?? '',
    };
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
}
