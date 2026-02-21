import type { FastifyRequest, FastifyReply } from 'fastify';
import { createLinkToken, exchangePublicToken } from '../services/plaid.service.js';
import { encrypt } from '../services/encryption.service.js';
import { publishTwinGeneration } from '../services/pubsub.service.js';
import { prisma } from '../config/database.js';
import { BadRequestError } from '../utils/errors.js';

export async function getLinkToken(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const userId = (await prisma.user.findUniqueOrThrow({
    where: { firebaseUid: request.user!.uid },
  })).id;
  const { linkToken, expiration } = await createLinkToken(userId);
  await reply.send({ linkToken, expiration });
}

interface ExchangeBody {
  publicToken: string;
}

export async function exchangeToken(
  request: FastifyRequest<{ Body: ExchangeBody }>,
  reply: FastifyReply,
): Promise<void> {
  const { publicToken } = request.body ?? {};
  if (!publicToken) throw new BadRequestError('publicToken required');

  const userId = (await prisma.user.findUniqueOrThrow({
    where: { firebaseUid: request.user!.uid },
  })).id;

  const { accessToken, itemId } = await exchangePublicToken(publicToken);
  const encrypted = await encrypt(accessToken);

  await prisma.user.update({
    where: { id: userId },
    data: {
      encryptedPlaidToken: encrypted,
      plaidItemId: itemId,
      hasPlaidConnection: true,
    },
  });

  await publishTwinGeneration(userId);
  await reply.status(202).send({ success: true, message: 'Twin generation started' });
}
