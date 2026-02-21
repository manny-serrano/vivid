import type { FastifyInstance } from 'fastify';
import { authRoutes } from './auth.routes.js';
import { plaidRoutes } from './plaid.routes.js';
import { twinRoutes } from './twin.routes.js';
import { shareRoutes } from './share.routes.js';
import { institutionRoutes } from './institution.routes.js';
import { env } from '../config/env.js';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  const prefix = `/api/${env.API_VERSION}`;
  await app.register(authRoutes, { prefix: `${prefix}/auth` });
  await app.register(plaidRoutes, { prefix: `${prefix}/plaid` });
  await app.register(twinRoutes, { prefix: `${prefix}/twin` });
  await app.register(shareRoutes, { prefix: `${prefix}/share` });
  await app.register(institutionRoutes, { prefix: `${prefix}/institution` });
}
