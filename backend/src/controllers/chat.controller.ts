import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';
import { generateChatResponse } from '../ai/chatbot.js';
import { BadRequestError } from '../utils/errors.js';

interface ChatBody {
  message: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
}

export async function chat(
  request: FastifyRequest<{ Body: ChatBody }>,
  reply: FastifyReply,
): Promise<void> {
  const { message, history = [] } = request.body ?? {};
  if (!message?.trim()) throw new BadRequestError('message is required');

  const user = await prisma.user.findUniqueOrThrow({
    where: { firebaseUid: request.user!.uid },
  });

  const twin = await prisma.twin.findUnique({ where: { userId: user.id } });

  const scoreContext = twin
    ? {
        overall: twin.overallScore,
        incomeStability: twin.incomeStabilityScore,
        spendingDiscipline: twin.spendingDisciplineScore,
        debtTrajectory: twin.debtTrajectoryScore,
        financialResilience: twin.financialResilienceScore,
        growthMomentum: twin.growthMomentumScore,
        consumerNarrative: twin.consumerNarrative,
      }
    : {
        overall: 0,
        incomeStability: 0,
        spendingDiscipline: 0,
        debtTrajectory: 0,
        financialResilience: 0,
        growthMomentum: 0,
        consumerNarrative: 'No twin generated yet.',
      };

  const response = await generateChatResponse(message, history, scoreContext);

  await reply.send({ response });
}
