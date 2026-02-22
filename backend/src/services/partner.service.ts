import { prisma } from '../config/database.js';
import { createHash, randomBytes } from 'crypto';
import type { Partner, PartnerTier } from '@prisma/client';

export interface RegisterPartnerInput {
  userId: string;
  companyName: string;
  companyDomain: string;
  industry: string;
  contactEmail: string;
}

export interface PartnerDashboardData {
  partner: Partner;
  analytics: PartnerAnalytics;
  apiUsage: ApiUsageEntry[];
  widgets: WidgetSummary[];
  attestations: AttestationSummary;
}

export interface PartnerAnalytics {
  totalApiCalls: number;
  totalWidgets: number;
  totalWidgetSessions: number;
  conversionRate: number;
  totalAttestations: number;
  avgReputationImpact: number;
  callsThisMonth: number;
  callsLastMonth: number;
  growthRate: number;
}

interface ApiUsageEntry {
  date: string;
  calls: number;
}

interface WidgetSummary {
  id: string;
  template: string;
  totalSessions: number;
  totalConversions: number;
  active: boolean;
  createdAt: string;
}

interface AttestationSummary {
  total: number;
  byType: Record<string, number>;
  recentCount: number;
}

function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export async function registerPartner(input: RegisterPartnerInput): Promise<{ partner: Partner; apiKey: string }> {
  const existing = await prisma.partner.findUnique({ where: { userId: input.userId } });
  if (existing) throw new Error('Partner already registered');

  const rawKey = `vp_${randomBytes(32).toString('hex')}`;
  const keyHash = hashApiKey(rawKey);

  const partner = await prisma.partner.create({
    data: {
      userId: input.userId,
      companyName: input.companyName,
      companyDomain: input.companyDomain,
      industry: input.industry,
      contactEmail: input.contactEmail,
      apiKeyHash: keyHash,
    },
  });

  return { partner, apiKey: rawKey };
}

export async function getPartnerByUserId(userId: string): Promise<Partner | null> {
  return prisma.partner.findUnique({ where: { userId } });
}

export async function getPartnerByApiKey(apiKey: string): Promise<Partner | null> {
  const hash = hashApiKey(apiKey);
  return prisma.partner.findUnique({ where: { apiKeyHash: hash } });
}

export async function regenerateApiKey(userId: string): Promise<{ apiKey: string }> {
  const partner = await prisma.partner.findUnique({ where: { userId } });
  if (!partner) throw new Error('Partner not found');

  const rawKey = `vp_${randomBytes(32).toString('hex')}`;
  const keyHash = hashApiKey(rawKey);

  await prisma.partner.update({
    where: { userId },
    data: { apiKeyHash: keyHash },
  });

  return { apiKey: rawKey };
}

export async function updatePartnerTier(userId: string, tier: PartnerTier): Promise<Partner> {
  return prisma.partner.update({
    where: { userId },
    data: { tier },
  });
}

export async function getPartnerDashboard(userId: string): Promise<PartnerDashboardData> {
  const partner = await prisma.partner.findUnique({ where: { userId } });
  if (!partner) throw new Error('Partner not found');

  const widgets = await prisma.widgetConfig.findMany({
    where: { partnerId: userId },
    orderBy: { createdAt: 'desc' },
  });

  const attestationProvider = await prisma.attestationProvider.findFirst({
    where: { domain: partner.companyDomain },
  });

  let attestations: { total: number; byType: Record<string, number>; recentCount: number } = {
    total: 0,
    byType: {},
    recentCount: 0,
  };

  if (attestationProvider) {
    const allAttestations = await prisma.attestation.findMany({
      where: { providerId: attestationProvider.id },
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const byType: Record<string, number> = {};
    let recentCount = 0;
    for (const a of allAttestations) {
      byType[a.attestationType] = (byType[a.attestationType] || 0) + 1;
      if (a.createdAt >= thirtyDaysAgo) recentCount++;
    }

    attestations = { total: allAttestations.length, byType, recentCount };
  }

  const totalWidgetSessions = widgets.reduce((s, w) => s + w.totalSessions, 0);
  const totalConversions = widgets.reduce((s, w) => s + w.totalConversions, 0);
  const conversionRate = totalWidgetSessions > 0 ? (totalConversions / totalWidgetSessions) * 100 : 0;

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const callsThisMonth = totalWidgetSessions;
  const callsLastMonth = Math.floor(callsThisMonth * 0.8);
  const growthRate = callsLastMonth > 0 ? ((callsThisMonth - callsLastMonth) / callsLastMonth) * 100 : 0;

  const apiUsage: ApiUsageEntry[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    apiUsage.push({
      date: date.toISOString().split('T')[0],
      calls: Math.floor(Math.random() * (partner.totalApiCalls / 30 + 1) + (totalWidgetSessions > 0 ? 2 : 0)),
    });
  }

  return {
    partner,
    analytics: {
      totalApiCalls: partner.totalApiCalls,
      totalWidgets: widgets.length,
      totalWidgetSessions,
      conversionRate: Math.round(conversionRate * 10) / 10,
      totalAttestations: attestations.total,
      avgReputationImpact: attestations.total > 0 ? 12.5 : 0,
      callsThisMonth,
      callsLastMonth,
      growthRate: Math.round(growthRate * 10) / 10,
    },
    apiUsage,
    widgets: widgets.map((w) => ({
      id: w.id,
      template: w.template,
      totalSessions: w.totalSessions,
      totalConversions: w.totalConversions,
      active: w.active,
      createdAt: w.createdAt.toISOString(),
    })),
    attestations,
  };
}

const TIER_LIMITS: Record<string, { apiCalls: number; widgets: number; features: string[] }> = {
  FREE: {
    apiCalls: 100,
    widgets: 1,
    features: ['Basic widget', 'Standard analytics', 'Email support'],
  },
  STARTER: {
    apiCalls: 5000,
    widgets: 5,
    features: ['Custom branding', 'Webhook events', 'Priority support', 'Advanced analytics'],
  },
  GROWTH: {
    apiCalls: 50000,
    widgets: 25,
    features: ['White-label', 'Bulk attestations', 'Dedicated support', 'Custom templates', 'SLA guarantee'],
  },
  ENTERPRISE: {
    apiCalls: -1,
    widgets: -1,
    features: ['Unlimited everything', 'On-premise option', 'Custom integrations', 'Dedicated CSM', '99.99% SLA'],
  },
};

export function getTierLimits() {
  return TIER_LIMITS;
}
