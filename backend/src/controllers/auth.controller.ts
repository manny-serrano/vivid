import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';
import { firebaseAuth } from '../config/firebase.js';
import { registerSchema } from '@vivid/shared';
import { BadRequestError } from '../utils/errors.js';

interface RegisterBody {
  firebaseToken: string;
  firstName: string;
  lastName: string;
}

export async function register(
  request: FastifyRequest<{ Body: RegisterBody }>,
  reply: FastifyReply,
): Promise<void> {
  const parsed = registerSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new BadRequestError(parsed.error.message);
  }
  const { firebaseToken, firstName, lastName } = parsed.data;

  const decoded = await firebaseAuth.verifyIdToken(firebaseToken);
  const email = decoded.email ?? '';
  if (!email) throw new BadRequestError('Email required');

  const user = await prisma.user.upsert({
    where: { firebaseUid: decoded.uid },
    create: {
      firebaseUid: decoded.uid,
      email,
      firstName,
      lastName,
    },
    update: { firstName, lastName, email },
  });

  const hasTwin = !!(await prisma.twin.findUnique({ where: { userId: user.id } }));
  await reply.status(201).send({
    user: {
      id: user.id,
      firebaseUid: user.firebaseUid,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      hasPlaidConnection: user.hasPlaidConnection,
      hasTwin,
    },
    token: firebaseToken,
  });
}

export async function me(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (!request.user) throw new Error('Auth required');
  const user = await prisma.user.findUnique({
    where: { firebaseUid: request.user.uid },
  });
  if (!user) throw new Error('User not found');
  const hasTwin = !!(await prisma.twin.findUnique({ where: { userId: user.id } }));
  await reply.send({
    user: {
      id: user.id,
      firebaseUid: user.firebaseUid,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      hasPlaidConnection: user.hasPlaidConnection,
      hasTwin,
    },
  });
}
