import type { FastifyInstance } from 'fastify';
import { authRoutes } from './auth.routes.js';
import { plaidRoutes } from './plaid.routes.js';
import { twinRoutes } from './twin.routes.js';
import { shareRoutes } from './share.routes.js';
import { institutionRoutes } from './institution.routes.js';
import { chatRoutes } from './chat.routes.js';
import { zkpRoutes } from './zkp.routes.js';
import { badgeRoutes } from './badge.routes.js';
import { insightsRoutes } from './insights.routes.js';
import { optimizerRoutes } from './optimizer.routes.js';
import { timeMachineRoutes } from './timeMachine.routes.js';
import { redFlagsRoutes } from './redFlags.routes.js';
import { env } from '../config/env.js';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  const prefix = `/api/${env.API_VERSION}`;
  await app.register(authRoutes, { prefix: `${prefix}/auth` });
  await app.register(plaidRoutes, { prefix: `${prefix}/plaid` });
  await app.register(twinRoutes, { prefix: `${prefix}/twin` });
  await app.register(shareRoutes, { prefix: `${prefix}/share` });
  await app.register(institutionRoutes, { prefix: `${prefix}/institution` });
  await app.register(chatRoutes, { prefix: `${prefix}/chat` });
  await app.register(zkpRoutes, { prefix: `${prefix}/zkp` });
  await app.register(badgeRoutes, { prefix: `${prefix}/verify` });
  await app.register(insightsRoutes, { prefix: `${prefix}/insights` });
  await app.register(optimizerRoutes, { prefix: `${prefix}/optimize` });
  await app.register(timeMachineRoutes, { prefix: `${prefix}/time-machine` });
  await app.register(redFlagsRoutes, { prefix: `${prefix}/red-flags` });
}
