import { api } from './api';

// ---------------------------------------------------------------------------
// Spend Optimizer
// ---------------------------------------------------------------------------

export interface DetectedCharge {
  merchantName: string;
  monthlyAmount: number;
  frequency: number;
  lastCharge: string;
  firstSeen: string;
  monthsSinceFirst: number;
  isUnnecessary: boolean;
  unnecessaryReason: string | null;
  category: string;
  totalSpent: number;
}

export interface CancelAction {
  merchantName: string;
  monthlyAmount: number;
  annualSavings: number;
  cancelMethod: 'email' | 'url' | 'phone';
  cancelUrl: string | null;
  draftEmail: string | null;
  phoneNumber: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
  tip: string;
}

export interface OptimizationReport {
  allCharges: DetectedCharge[];
  unnecessaryCharges: DetectedCharge[];
  totalMonthlySpending: number;
  potentialMonthlySavings: number;
  potentialAnnualSavings: number;
  cancelActions: CancelAction[];
  aiSummary: string | null;
}

// ---------------------------------------------------------------------------
// Loan Shield
// ---------------------------------------------------------------------------

export type RiskLevel = 'low' | 'moderate' | 'elevated' | 'high' | 'critical';

export interface IncomeAnalysis {
  averageMonthlyIncome: number;
  recentMonthlyIncome: number;
  incomeSlope: number;
  incomeTrend: string;
  incomeDropPercent: number;
  monthsOfDecline: number;
}

export interface DebtPaymentAnalysis {
  averageMonthlyDebt: number;
  debtToIncomeRatio: number;
  estimatedStudentLoanPayment: number;
  isAtRisk: boolean;
}

export interface ShieldAlert {
  riskLevel: RiskLevel;
  title: string;
  description: string;
  recommendation: string;
}

export interface DocumentDraft {
  type: string;
  title: string;
  description: string;
  content: string;
  hederaHash: string | null;
  hederaTransactionId: string | null;
  hederaTimestamp: string | null;
}

export interface LoanShieldReport {
  incomeAnalysis: IncomeAnalysis;
  debtAnalysis: DebtPaymentAnalysis;
  riskLevel: RiskLevel;
  alerts: ShieldAlert[];
  documents: DocumentDraft[];
  aiInsight: string | null;
  runwayWithoutIncome: number;
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export const optimizerService = {
  getSubscriptions: () =>
    api.get<OptimizationReport>('/optimize/subscriptions').then((r) => r.data),

  getLoanShield: () =>
    api.get<LoanShieldReport>('/optimize/loan-shield').then((r) => r.data),
};
