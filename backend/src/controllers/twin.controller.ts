import type { FastifyRequest, FastifyReply } from 'fastify';
import { getTwin } from '../services/twin.service.js';
import { publishTwinGeneration } from '../services/pubsub.service.js';
import { prisma } from '../config/database.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

export async function getMyTwin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const userId = (await prisma.user.findUniqueOrThrow({
    where: { firebaseUid: request.user!.uid },
  })).id;
  const twin = await getTwin(userId);
  if (!twin) throw new NotFoundError('Twin not found');
  await reply.send(twin);
}

export async function regenerateMyTwin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { firebaseUid: request.user!.uid },
  });

  if (!user.hasPlaidConnection || !user.encryptedPlaidToken) {
    throw new BadRequestError('No linked bank account. Connect via Plaid first.');
  }

  await publishTwinGeneration(user.id);
  await reply.status(202).send({ success: true, message: 'Twin regeneration started' });
}

export async function getSnapshots(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const userId = (await prisma.user.findUniqueOrThrow({
    where: { firebaseUid: request.user!.uid },
  })).id;

  const snapshots = await prisma.twinSnapshot.findMany({
    where: { userId },
    orderBy: { snapshotAt: 'asc' },
  });

  await reply.send(snapshots);
}

export async function getTransactionDrilldown(
  request: FastifyRequest<{ Params: { category: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const userId = (await prisma.user.findUniqueOrThrow({
    where: { firebaseUid: request.user!.uid },
  })).id;

  const twin = await prisma.twin.findUnique({ where: { userId } });
  if (!twin) throw new NotFoundError('Twin not found');

  const { category } = request.params;

  const transactions = await prisma.transaction.findMany({
    where: { twinId: twin.id, vividCategory: category },
    orderBy: { date: 'desc' },
    select: {
      id: true,
      amount: true,
      date: true,
      merchantName: true,
      vividCategory: true,
      isRecurring: true,
      isIncomeDeposit: true,
    },
  });

  const total = transactions.reduce((s, t) => s + Math.abs(t.amount), 0);
  const count = transactions.length;

  await reply.send({
    category,
    total: Math.round(total * 100) / 100,
    count,
    transactions,
  });
}

export async function getCategoryAggregates(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const userId = (await prisma.user.findUniqueOrThrow({
    where: { firebaseUid: request.user!.uid },
  })).id;

  const twin = await prisma.twin.findUnique({ where: { userId } });
  if (!twin) throw new NotFoundError('Twin not found');

  const transactions = await prisma.transaction.findMany({
    where: { twinId: twin.id },
    select: { amount: true, vividCategory: true, isIncomeDeposit: true },
  });

  const byCategory: Record<string, { total: number; count: number }> = {};
  for (const t of transactions) {
    if (t.isIncomeDeposit) continue;
    const cat = t.vividCategory || 'other';
    if (!byCategory[cat]) byCategory[cat] = { total: 0, count: 0 };
    byCategory[cat].total += Math.abs(t.amount);
    byCategory[cat].count += 1;
  }

  const result = Object.entries(byCategory)
    .map(([category, data]) => ({
      category,
      total: Math.round(data.total * 100) / 100,
      count: data.count,
    }))
    .sort((a, b) => b.total - a.total);

  await reply.send(result);
}
