import { prisma } from '../config/database.js';
import type { UserProfile, CreditStatus, AgeRange, IncomeRange, EmploymentType } from '@prisma/client';

export interface ProfileInput {
  ageRange?: AgeRange;
  city?: string;
  state?: string;
  incomeRange?: IncomeRange;
  employmentType?: EmploymentType;
  creditStatus?: CreditStatus;
  hasFico?: boolean;
  isInternational?: boolean;
  isStudent?: boolean;
  isGigWorker?: boolean;
}

export async function getOrCreateProfile(userId: string): Promise<UserProfile> {
  let profile = await prisma.userProfile.findUnique({ where: { userId } });
  if (!profile) {
    profile = await prisma.userProfile.create({ data: { userId } });
  }
  return profile;
}

export async function updateProfile(userId: string, input: ProfileInput): Promise<UserProfile> {
  await getOrCreateProfile(userId);
  return prisma.userProfile.update({
    where: { userId },
    data: {
      ...input,
      ...(input.creditStatus === 'CREDIT_INVISIBLE' || input.hasFico === false
        ? { hasFico: false, creditStatus: 'CREDIT_INVISIBLE' }
        : {}),
    },
  });
}

export async function completeOnboarding(userId: string): Promise<UserProfile> {
  await getOrCreateProfile(userId);
  return prisma.userProfile.update({
    where: { userId },
    data: { onboardedAt: new Date() },
  });
}

export interface IdentityCard {
  name: string;
  vividScore: number;
  pillarScores: { label: string; score: number }[];
  creditStatus: string;
  employmentType: string | null;
  monthsOfData: number;
  transactionCount: number;
  incomeStreams: number;
  lendingReadiness: { personal: number; auto: number; mortgage: number };
  blockchainVerified: boolean;
  hederaTopicId: string | null;
  generatedAt: string;
  strengths: string[];
  badges: string[];
}

export async function generateIdentityCard(userId: string): Promise<IdentityCard | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const twin = await prisma.twin.findUnique({
    where: { userId },
    include: { transactions: true },
  });
  if (!twin) return null;

  const profile = await getOrCreateProfile(userId);

  const incomeStreams = new Set(
    twin.transactions
      .filter((t) => t.isIncomeDeposit)
      .map((t) => (t.merchantName ?? 'unknown').toLowerCase())
  ).size;

  const strengths: string[] = [];
  if (twin.incomeStabilityScore >= 70) strengths.push('Consistent income deposits');
  if (twin.spendingDisciplineScore >= 70) strengths.push('Disciplined spending habits');
  if (twin.debtTrajectoryScore >= 70) strengths.push('Healthy debt management');
  if (twin.financialResilienceScore >= 70) strengths.push('Strong financial resilience');
  if (twin.growthMomentumScore >= 70) strengths.push('Positive growth trajectory');
  if (incomeStreams >= 2) strengths.push('Diversified income sources');
  if (twin.transactionCount >= 100) strengths.push('Rich transaction history');
  const recurring = twin.transactions.filter((t) => t.isRecurring && !t.isIncomeDeposit);
  const onTimeRatio = recurring.length > 0 ? 1.0 : 0;
  if (onTimeRatio > 0.8) strengths.push('On-time recurring payments');

  const badges: string[] = [];
  if (twin.blockchainVerified) badges.push('Blockchain Verified');
  if (twin.overallScore >= 70) badges.push('Vivid Trusted');
  if (twin.analysisMonths >= 6) badges.push('6+ Month History');
  if (twin.analysisMonths >= 12) badges.push('Full Year Analyzed');
  if (profile.creditStatus === 'CREDIT_INVISIBLE') badges.push('Credit Pioneer');
  if (profile.isGigWorker || profile.employmentType === 'GIG_FREELANCE') badges.push('Gig Economy Verified');
  if (profile.isInternational) badges.push('Global Citizen');

  const attestations = await prisma.attestation.count({
    where: { userId, revokedAt: null },
  });
  if (attestations >= 1) badges.push('Peer Attested');
  if (attestations >= 3) badges.push('Network Trusted');

  return {
    name: `${user.firstName} ${user.lastName}`,
    vividScore: twin.overallScore,
    pillarScores: [
      { label: 'Income Stability', score: twin.incomeStabilityScore },
      { label: 'Spending Discipline', score: twin.spendingDisciplineScore },
      { label: 'Debt Trajectory', score: twin.debtTrajectoryScore },
      { label: 'Financial Resilience', score: twin.financialResilienceScore },
      { label: 'Growth Momentum', score: twin.growthMomentumScore },
    ],
    creditStatus: profile.creditStatus,
    employmentType: profile.employmentType,
    monthsOfData: twin.analysisMonths,
    transactionCount: twin.transactionCount,
    incomeStreams,
    lendingReadiness: {
      personal: twin.personalLoanReadiness,
      auto: twin.autoLoanReadiness,
      mortgage: twin.mortgageReadiness,
    },
    blockchainVerified: twin.blockchainVerified,
    hederaTopicId: twin.hederaTopicId,
    generatedAt: twin.generatedAt.toISOString(),
    strengths,
    badges,
  };
}
