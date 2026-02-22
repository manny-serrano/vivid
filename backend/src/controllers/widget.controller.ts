// ---------------------------------------------------------------------------
// Vivid – Widget Controller
// ---------------------------------------------------------------------------

import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';
import {
  createWidget,
  getWidgetPublicConfig,
  listPartnerWidgets,
  initiateSession,
  consentSession,
  completeSession,
  denySession,
  exchangeToken,
  getWidgetAnalytics,
  VALID_SCOPES,
} from '../services/widget.service.js';
import { BadRequestError, UnauthorizedError, NotFoundError } from '../utils/errors.js';

// ---------------------------------------------------------------------------
// Create widget (authenticated Vivid user = partner)
// ---------------------------------------------------------------------------

interface CreateWidgetBody {
  partnerName: string;
  partnerDomain: string;
  template: string;
  allowedOrigins: string[];
  brandColor?: string;
  logoUrl?: string;
  scopes?: string[];
  callbackUrl?: string;
  webhookUrl?: string;
}

export async function createWidgetHandler(
  request: FastifyRequest<{ Body: CreateWidgetBody }>,
  reply: FastifyReply,
): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { firebaseUid: request.user!.uid },
  });

  const { partnerName, partnerDomain, template, allowedOrigins } = request.body ?? {};
  if (!partnerName || !partnerDomain || !template || !allowedOrigins?.length) {
    throw new BadRequestError('partnerName, partnerDomain, template, and allowedOrigins are required');
  }

  const result = await createWidget(user.id, {
    ...request.body,
    scopes: request.body.scopes ?? [],
  });
  await reply.status(201).send(result);
}

// ---------------------------------------------------------------------------
// List my widgets (authenticated)
// ---------------------------------------------------------------------------

export async function listMyWidgetsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { firebaseUid: request.user!.uid },
  });

  const widgets = await listPartnerWidgets(user.id);
  await reply.send({ widgets });
}

// ---------------------------------------------------------------------------
// Get widget analytics (authenticated owner)
// ---------------------------------------------------------------------------

interface WidgetIdParams {
  widgetId: string;
}

export async function getWidgetAnalyticsHandler(
  request: FastifyRequest<{ Params: WidgetIdParams }>,
  reply: FastifyReply,
): Promise<void> {
  const { widgetId } = request.params;
  const analytics = await getWidgetAnalytics(widgetId);
  if (!analytics) throw new NotFoundError('Widget not found');
  await reply.send(analytics);
}

// ---------------------------------------------------------------------------
// Public: get widget config (for iframe to render)
// ---------------------------------------------------------------------------

export async function getWidgetConfigHandler(
  request: FastifyRequest<{ Params: WidgetIdParams }>,
  reply: FastifyReply,
): Promise<void> {
  const { widgetId } = request.params;
  const config = await getWidgetPublicConfig(widgetId);
  if (!config || !config.active) throw new NotFoundError('Widget not found or inactive');
  await reply.send(config);
}

// ---------------------------------------------------------------------------
// Public: initiate widget session
// ---------------------------------------------------------------------------

export async function initiateSessionHandler(
  request: FastifyRequest<{ Params: WidgetIdParams }>,
  reply: FastifyReply,
): Promise<void> {
  const { widgetId } = request.params;
  const origin = request.headers.origin ?? request.headers.referer ?? undefined;
  const userAgent = request.headers['user-agent'] ?? undefined;

  const session = await initiateSession(widgetId, origin, userAgent);
  if (!session) throw new BadRequestError('Widget not found, inactive, or origin not allowed');

  await reply.status(201).send(session);
}

// ---------------------------------------------------------------------------
// Consent (authenticated user approves sharing)
// ---------------------------------------------------------------------------

interface ConsentBody {
  sessionToken: string;
  consentedScopes: string[];
}

export async function consentHandler(
  request: FastifyRequest<{ Body: ConsentBody }>,
  reply: FastifyReply,
): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { firebaseUid: request.user!.uid },
  });

  const { sessionToken, consentedScopes } = request.body ?? {};
  if (!sessionToken || !consentedScopes?.length) {
    throw new BadRequestError('sessionToken and consentedScopes are required');
  }

  const result = await consentSession(sessionToken, user.id, consentedScopes);
  if (!result) throw new NotFoundError('Session not found');
  if ('error' in result) throw new BadRequestError(result.error);

  await reply.send(result);
}

// ---------------------------------------------------------------------------
// Complete session (user confirms)
// ---------------------------------------------------------------------------

interface SessionTokenBody {
  sessionToken: string;
}

export async function completeHandler(
  request: FastifyRequest<{ Body: SessionTokenBody }>,
  reply: FastifyReply,
): Promise<void> {
  const { sessionToken } = request.body ?? {};
  if (!sessionToken) throw new BadRequestError('sessionToken is required');

  const result = await completeSession(sessionToken);
  if (!result) throw new NotFoundError('Session not found');
  if ('error' in result) throw new BadRequestError(result.error);

  await reply.send(result);
}

// ---------------------------------------------------------------------------
// Deny session
// ---------------------------------------------------------------------------

export async function denyHandler(
  request: FastifyRequest<{ Body: SessionTokenBody }>,
  reply: FastifyReply,
): Promise<void> {
  const { sessionToken } = request.body ?? {};
  if (!sessionToken) throw new BadRequestError('sessionToken is required');

  const result = await denySession(sessionToken);
  if (!result) throw new NotFoundError('Session not found');

  await reply.send(result);
}

// ---------------------------------------------------------------------------
// Server-side token exchange (partner verifies via API key)
// ---------------------------------------------------------------------------

interface ExchangeBody {
  sessionToken: string;
}

export async function exchangeHandler(
  request: FastifyRequest<{ Body: ExchangeBody }>,
  reply: FastifyReply,
): Promise<void> {
  const apiKey = request.headers['x-vivid-api-key'] as string | undefined;
  if (!apiKey) throw new UnauthorizedError('x-vivid-api-key header is required');

  const { sessionToken } = request.body ?? {};
  if (!sessionToken) throw new BadRequestError('sessionToken is required');

  const result = await exchangeToken(sessionToken, apiKey);
  if ('error' in result) {
    if (result.error === 'Invalid API key') throw new UnauthorizedError(result.error);
    throw new BadRequestError(result.error);
  }

  await reply.send(result);
}

// ---------------------------------------------------------------------------
// Available scopes & templates (public)
// ---------------------------------------------------------------------------

export async function getScopesHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  await reply.send({
    scopes: [...VALID_SCOPES],
    templates: ['LENDING', 'RENTAL', 'GIG_HIRING', 'CHECKOUT', 'GENERIC'],
  });
}
