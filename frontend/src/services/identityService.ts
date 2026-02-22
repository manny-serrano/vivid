import { api } from './api';

export type AgeRange = 'UNDER_18' | 'AGE_18_24' | 'AGE_25_34' | 'AGE_35_44' | 'AGE_45_54' | 'AGE_55_64' | 'AGE_65_PLUS';
export type IncomeRange = 'UNDER_25K' | 'RANGE_25K_50K' | 'RANGE_50K_75K' | 'RANGE_75K_100K' | 'RANGE_100K_150K' | 'RANGE_150K_PLUS';
export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'GIG_FREELANCE' | 'SELF_EMPLOYED' | 'STUDENT' | 'UNEMPLOYED' | 'RETIRED';
export type CreditStatus = 'UNKNOWN' | 'CREDIT_INVISIBLE' | 'THIN_FILE' | 'ESTABLISHED';

export interface UserProfile {
  id: string;
  userId: string;
  ageRange: AgeRange | null;
  city: string | null;
  state: string | null;
  incomeRange: IncomeRange | null;
  employmentType: EmploymentType | null;
  creditStatus: CreditStatus;
  hasFico: boolean;
  isInternational: boolean;
  isStudent: boolean;
  isGigWorker: boolean;
  identityVerified: boolean;
  onboardedAt: string | null;
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

export const identityService = {
  getProfile: () => api.get<UserProfile>('/identity/profile').then((r) => r.data),
  updateProfile: (data: ProfileInput) => api.patch<UserProfile>('/identity/profile', data).then((r) => r.data),
  completeOnboarding: () => api.post<UserProfile>('/identity/complete-onboarding').then((r) => r.data),
  getCard: () => api.get<IdentityCard>('/identity/card').then((r) => r.data),
};
