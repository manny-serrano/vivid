// ---------------------------------------------------------------------------
// Vivid – Embedded Widget Service
// ---------------------------------------------------------------------------

import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateWidgetInput {
  partnerName: string;
  partnerDomain: string;
  template: string;
  allowedOrigins: string[];
  brandColor?: string;
  logoUrl?: string;
  scopes: string[];
  callbackUrl?: string;
  webhookUrl?: string;
}

export const VALID_SCOPES = [
  'overall_score',
  'score_tier',
  'dimension_scores',
  'lending_readiness',
  'narrative',
  'blockchain_proof',
  'reputation_score',
] as const;

export type WidgetScope = (typeof VALID_SCOPES)[number];

const TEMPLATE_DEFAULTS: Record<string, string[]> = {
  LENDING: ['overall_score', 'score_tier', 'dimension_scores', 'lending_readiness', 'blockchain_proof'],
  RENTAL: ['overall_score', 'score_tier', 'dimension_scores', 'narrative'],
  GIG_HIRING: ['overall_score', 'score_tier', 'reputation_score'],
  CHECKOUT: ['overall_score', 'score_tier'],
  GENERIC: ['overall_score', 'score_tier'],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hashApiKey(key: string): string {
  return createHash('sha256').update(key, 'utf8').digest('hex');
}

function tierFromScore(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 65) return 'Strong';
  if (score >= 50) return 'Moderate';
  if (score >= 35) return 'Developing';
  return 'Early Stage';
}

// ---------------------------------------------------------------------------
// Widget CRUD
// ---------------------------------------------------------------------------

export async function createWidget(partnerId: string, input: CreateWidgetInput) {
  const apiKey = `vivid_wgt_${randomBytes(24).toString('hex')}`;
  const apiKeyHash = hashApiKey(apiKey);
  const template = input.template.toUpperCase();
  const defaultScopes = TEMPLATE_DEFAULTS[template] ?? TEMPLATE_DEFAULTS.GENERIC;
  const scopes = input.scopes.length > 0
    ? input.scopes.filter((s) => VALID_SCOPES.includes(s as WidgetScope))
    : defaultScopes;

  const widget = await prisma.widgetConfig.create({
    data: {
      partnerId,
      partnerName: input.partnerName,
      partnerDomain: input.partnerDomain,
      apiKeyHash,
      template: template as never,
      allowedOrigins: input.allowedOrigins,
      brandColor: input.brandColor ?? '#8b5cf6',
      logoUrl: input.logoUrl,
      scopes,
      callbackUrl: input.callbackUrl,
      webhookUrl: input.webhookUrl,
    },
  });

  return {
    id: widget.id,
    apiKey,
    partnerName: widget.partnerName,
    template: widget.template,
    scopes: widget.scopes,
    embedCode: generateEmbedCode(widget.id, input.partnerDomain),
    message: 'Store this API key securely — it cannot be retrieved again.',
  };
}

export async function getWidgetById(widgetId: string) {
  return prisma.widgetConfig.findUnique({
    where: { id: widgetId },
    include: { _count: { select: { sessions: true } } },
  });
}

export async function listPartnerWidgets(partnerId: string) {
  return prisma.widgetConfig.findMany({
    where: { partnerId },
    include: { _count: { select: { sessions: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function verifyWidgetApiKey(apiKey: string) {
  const hash = hashApiKey(apiKey);
  return prisma.widgetConfig.findUnique({ where: { apiKeyHash: hash } });
}

export async function getWidgetPublicConfig(widgetId: string) {
  const widget = await prisma.widgetConfig.findUnique({
    where: { id: widgetId },
    select: {
      id: true,
      partnerName: true,
      partnerDomain: true,
      template: true,
      brandColor: true,
      logoUrl: true,
      scopes: true,
      active: true,
    },
  });
  return widget;
}

// ---------------------------------------------------------------------------
// Widget sessions (OAuth-like flow)
// ---------------------------------------------------------------------------

export async function initiateSession(widgetId: string, origin?: string, userAgent?: string) {
  const widget = await prisma.widgetConfig.findUnique({ where: { id: widgetId } });
  if (!widget || !widget.active) return null;

  if (origin && widget.allowedOrigins.length > 0) {
    const allowed = widget.allowedOrigins.some((o) =>
      origin === o || origin.endsWith(`.${o.replace(/^https?:\/\//, '')}`),
    );
    if (!allowed) {
      logger.warn('[widget] Origin not allowed', { origin, widgetId });
      return null;
    }
  }

  const session = await prisma.widgetSession.create({
    data: {
      widgetId,
      origin,
      userAgent,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min
    },
  });

  await prisma.widgetConfig.update({
    where: { id: widgetId },
    data: { totalSessions: { increment: 1 } },
  });

  return {
    sessionToken: session.sessionToken,
    expiresAt: session.expiresAt.toISOString(),
    widget: {
      partnerName: widget.partnerName,
      template: widget.template,
      brandColor: widget.brandColor,
      logoUrl: widget.logoUrl,
      scopes: widget.scopes,
    },
  };
}

export async function consentSession(
  sessionToken: string,
  userId: string,
  consentedScopes: string[],
) {
  const session = await prisma.widgetSession.findUnique({ where: { sessionToken } });
  if (!session) return null;
  if (session.status !== 'PENDING') return { error: 'Session already processed' };
  if (session.expiresAt < new Date()) {
    await prisma.widgetSession.update({
      where: { id: session.id },
      data: { status: 'EXPIRED' },
    });
    return { error: 'Session expired' };
  }

  const widget = await prisma.widgetConfig.findUnique({ where: { id: session.widgetId } });
  if (!widget) return null;

  const validScopes = consentedScopes.filter((s) => widget.scopes.includes(s));
  const twin = await prisma.twin.findUnique({ where: { userId } });
  if (!twin) return { error: 'No Financial Twin found' };

  const resultData = buildScopedResult(twin, validScopes);

  await prisma.widgetSession.update({
    where: { id: session.id },
    data: {
      userId,
      status: 'CONSENTED',
      consentedScopes: validScopes,
      resultData: JSON.stringify(resultData),
    },
  });

  return {
    sessionToken,
    status: 'CONSENTED',
    scopes: validScopes,
    preview: resultData,
  };
}

export async function completeSession(sessionToken: string) {
  const session = await prisma.widgetSession.findUnique({
    where: { sessionToken },
    include: { widget: true },
  });
  if (!session) return null;
  if (session.status !== 'CONSENTED') return { error: 'Session not consented' };

  await prisma.widgetSession.update({
    where: { id: session.id },
    data: { status: 'COMPLETED', completedAt: new Date() },
  });

  await prisma.widgetConfig.update({
    where: { id: session.widgetId },
    data: { totalConversions: { increment: 1 } },
  });

  return {
    sessionToken,
    status: 'COMPLETED',
    callbackUrl: session.widget.callbackUrl,
  };
}

export async function denySession(sessionToken: string) {
  const session = await prisma.widgetSession.findUnique({ where: { sessionToken } });
  if (!session) return null;

  await prisma.widgetSession.update({
    where: { id: session.id },
    data: { status: 'DENIED' },
  });

  return { sessionToken, status: 'DENIED' };
}

// ---------------------------------------------------------------------------
// Server-side token exchange (partner verifies the session result)
// ---------------------------------------------------------------------------

export async function exchangeToken(sessionToken: string, apiKey: string) {
  const widget = await verifyWidgetApiKey(apiKey);
  if (!widget) return { error: 'Invalid API key' };

  const session = await prisma.widgetSession.findUnique({ where: { sessionToken } });
  if (!session) return { error: 'Session not found' };
  if (session.widgetId !== widget.id) return { error: 'Session does not belong to this widget' };
  if (session.status !== 'COMPLETED' && session.status !== 'CONSENTED') {
    return { error: `Session status is ${session.status}` };
  }

  return {
    valid: true,
    status: session.status,
    userId: session.userId,
    scopes: session.consentedScopes,
    data: session.resultData ? JSON.parse(session.resultData) : null,
    completedAt: session.completedAt?.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Widget analytics
// ---------------------------------------------------------------------------

export async function getWidgetAnalytics(widgetId: string) {
  const widget = await prisma.widgetConfig.findUnique({ where: { id: widgetId } });
  if (!widget) return null;

  const [total, completed, denied, expired] = await Promise.all([
    prisma.widgetSession.count({ where: { widgetId } }),
    prisma.widgetSession.count({ where: { widgetId, status: 'COMPLETED' } }),
    prisma.widgetSession.count({ where: { widgetId, status: 'DENIED' } }),
    prisma.widgetSession.count({ where: { widgetId, status: 'EXPIRED' } }),
  ]);

  const conversionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    widgetId,
    partnerName: widget.partnerName,
    template: widget.template,
    totalSessions: total,
    completed,
    denied,
    expired,
    pending: total - completed - denied - expired,
    conversionRate,
  };
}

// ---------------------------------------------------------------------------
// Scoped result builder
// ---------------------------------------------------------------------------

interface TwinRecord {
  overallScore: number;
  incomeStabilityScore: number;
  spendingDisciplineScore: number;
  debtTrajectoryScore: number;
  financialResilienceScore: number;
  growthMomentumScore: number;
  consumerNarrative: string;
  personalLoanReadiness: number;
  autoLoanReadiness: number;
  mortgageReadiness: number;
  smallBizReadiness: number;
  blockchainVerified: boolean;
  profileHash: string;
  hederaTransactionId: string | null;
}

function buildScopedResult(twin: TwinRecord, scopes: string[]) {
  const scopeSet = new Set(scopes);
  const result: Record<string, unknown> = { verified: true };

  if (scopeSet.has('overall_score')) {
    result.overallScore = twin.overallScore;
  }
  if (scopeSet.has('score_tier')) {
    result.scoreTier = tierFromScore(twin.overallScore);
  }
  if (scopeSet.has('dimension_scores')) {
    result.dimensions = {
      incomeStability: { score: twin.incomeStabilityScore, tier: tierFromScore(twin.incomeStabilityScore) },
      spendingDiscipline: { score: twin.spendingDisciplineScore, tier: tierFromScore(twin.spendingDisciplineScore) },
      debtTrajectory: { score: twin.debtTrajectoryScore, tier: tierFromScore(twin.debtTrajectoryScore) },
      financialResilience: { score: twin.financialResilienceScore, tier: tierFromScore(twin.financialResilienceScore) },
      growthMomentum: { score: twin.growthMomentumScore, tier: tierFromScore(twin.growthMomentumScore) },
    };
  }
  if (scopeSet.has('lending_readiness')) {
    result.lendingReadiness = {
      personalLoan: { score: twin.personalLoanReadiness, tier: tierFromScore(twin.personalLoanReadiness) },
      autoLoan: { score: twin.autoLoanReadiness, tier: tierFromScore(twin.autoLoanReadiness) },
      mortgage: { score: twin.mortgageReadiness, tier: tierFromScore(twin.mortgageReadiness) },
      smallBusiness: { score: twin.smallBizReadiness, tier: tierFromScore(twin.smallBizReadiness) },
    };
  }
  if (scopeSet.has('narrative')) {
    result.narrative = twin.consumerNarrative.slice(0, 500);
  }
  if (scopeSet.has('blockchain_proof')) {
    result.blockchain = {
      verified: twin.blockchainVerified,
      profileHash: twin.profileHash,
      hederaTransactionId: twin.hederaTransactionId,
    };
  }

  return result;
}

// ---------------------------------------------------------------------------
// Embed code generator
// ---------------------------------------------------------------------------

function generateEmbedCode(widgetId: string, domain: string): string {
  return `<!-- Vivid Widget -->
<div id="vivid-widget"></div>
<script>
  (function() {
    var s = document.createElement('script');
    s.src = '${domain.includes('localhost') ? 'http://localhost:5173' : 'https://app.vivid.finance'}/widget/sdk.js';
    s.dataset.widgetId = '${widgetId}';
    s.async = true;
    document.head.appendChild(s);
  })();
</script>`;
}
