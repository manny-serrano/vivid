import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';
import {
  detectNegotiableBills,
  generateNegotiationEmail,
  refineEmail,
} from '../services/negotiate.service.js';

async function resolveUser(request: FastifyRequest) {
  const firebaseUid = request.user!.uid;
  const user = await prisma.user.findUnique({ where: { firebaseUid } });
  if (!user) throw new Error('User not found');
  return user;
}

export async function detectBillsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const user = await resolveUser(request);
  const bills = await detectNegotiableBills(user.id);
  await reply.send({ bills });
}

export async function generateEmailHandler(
  request: FastifyRequest<{
    Body: {
      merchantName: string;
      currentMonthly: number;
      estimatedFair: number;
      negotiationType: string;
      tone?: string;
    };
  }>,
  reply: FastifyReply,
): Promise<void> {
  const user = await resolveUser(request);
  const { merchantName, currentMonthly, estimatedFair, negotiationType, tone } = request.body;
  const email = await generateNegotiationEmail(
    { merchantName, currentMonthly, estimatedFair, negotiationType },
    `${user.firstName} ${user.lastName}`,
    tone ?? 'professional',
  );
  await reply.send(email);
}

export async function refineEmailHandler(
  request: FastifyRequest<{
    Body: {
      currentEmail: string;
      instruction: string;
      merchantName: string;
      currentMonthly: number;
      estimatedFair: number;
    };
  }>,
  reply: FastifyReply,
): Promise<void> {
  const user = await resolveUser(request);
  const { currentEmail, instruction, merchantName, currentMonthly, estimatedFair } = request.body;
  const result = await refineEmail({
    currentEmail,
    instruction,
    merchantName,
    context: {
      currentMonthly,
      estimatedFair,
      userName: `${user.firstName} ${user.lastName}`,
    },
  });
  await reply.send(result);
}
