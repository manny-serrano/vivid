// ---------------------------------------------------------------------------
// Vivid – Student Loan Shield (Income monitoring + IDR/Deferment drafting)
// ---------------------------------------------------------------------------

import { createHash } from 'node:crypto';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { mean, linearRegressionSlope } from './scoreCalculator.js';
import type { MonthlyData } from './scoreCalculator.js';
import { createHederaClient, TopicMessageSubmitTransaction, TopicId } from '../blockchain/hederaClient.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RiskLevel = 'low' | 'moderate' | 'elevated' | 'high' | 'critical';

export interface IncomeAnalysis {
  averageMonthlyIncome: number;
  recentMonthlyIncome: number;
  incomeSlope: number;
  incomeTrend: 'growing' | 'stable' | 'declining' | 'volatile';
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
  type: 'idr_application' | 'deferment_request' | 'forbearance_request';
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

interface TransactionInput {
  amount: number;
  date: string;
  merchantName: string | null;
  name: string;
  vividCategory: string;
  isRecurring: boolean;
  isIncomeDeposit: boolean;
}

// ---------------------------------------------------------------------------
// Core engine
// ---------------------------------------------------------------------------

export async function analyzeLoanRisk(
  monthlyData: MonthlyData[],
  transactions: TransactionInput[],
  userName: string,
  userId: string,
): Promise<LoanShieldReport> {
  const incomeAnalysis = analyzeIncome(monthlyData);
  const debtAnalysis = analyzeDebtPayments(monthlyData, transactions);
  const riskLevel = computeRiskLevel(incomeAnalysis, debtAnalysis);
  const alerts = generateAlerts(incomeAnalysis, debtAnalysis, riskLevel);

  const avgExpenses = mean(monthlyData.map((m) => m.totalSpending));
  const latestBalance = monthlyData.length > 0 ? monthlyData[monthlyData.length - 1].endBalance : 0;
  const runwayWithoutIncome = avgExpenses > 0 ? Math.max(0, Math.floor(Math.max(latestBalance, 0) / avgExpenses)) : 0;

  const documents: DocumentDraft[] = [];
  if (riskLevel === 'elevated' || riskLevel === 'high' || riskLevel === 'critical') {
    if (debtAnalysis.estimatedStudentLoanPayment > 0) {
      const idrDoc = await generateIDRApplication(userName, incomeAnalysis, debtAnalysis, userId);
      documents.push(idrDoc);
    }

    if (riskLevel === 'high' || riskLevel === 'critical') {
      const deferDoc = await generateDefermentRequest(userName, incomeAnalysis, debtAnalysis, userId);
      documents.push(deferDoc);
    }

    if (riskLevel === 'critical') {
      const forbDoc = await generateForbearanceRequest(userName, incomeAnalysis, userId);
      documents.push(forbDoc);
    }
  }

  const aiInsight = await generateShieldInsight(incomeAnalysis, debtAnalysis, riskLevel, alerts, userName);

  return {
    incomeAnalysis,
    debtAnalysis,
    riskLevel,
    alerts,
    documents,
    aiInsight,
    runwayWithoutIncome,
  };
}

// ---------------------------------------------------------------------------
// Income analysis
// ---------------------------------------------------------------------------

function analyzeIncome(monthlyData: MonthlyData[]): IncomeAnalysis {
  const incomes = monthlyData.map((m) => m.totalDeposits);
  const avgIncome = mean(incomes);
  const recentMonths = incomes.slice(-3);
  const recentAvg = mean(recentMonths);
  const slope = linearRegressionSlope(incomes);

  const dropPercent = avgIncome > 0 ? Math.max(0, ((avgIncome - recentAvg) / avgIncome) * 100) : 0;

  let monthsOfDecline = 0;
  for (let i = incomes.length - 1; i >= 1; i--) {
    if (incomes[i] < incomes[i - 1] * 0.9) monthsOfDecline++;
    else break;
  }

  let cv = 0;
  if (incomes.length >= 2) {
    const m = mean(incomes);
    let sumSq = 0;
    for (const v of incomes) sumSq += (v - m) ** 2;
    cv = m > 0 ? Math.sqrt(sumSq / incomes.length) / m : 0;
  }

  let incomeTrend: 'growing' | 'stable' | 'declining' | 'volatile';
  if (cv > 0.4) incomeTrend = 'volatile';
  else if (slope > 50) incomeTrend = 'growing';
  else if (slope < -50) incomeTrend = 'declining';
  else incomeTrend = 'stable';

  return {
    averageMonthlyIncome: Math.round(avgIncome),
    recentMonthlyIncome: Math.round(recentAvg),
    incomeSlope: Math.round(slope),
    incomeTrend,
    incomeDropPercent: Math.round(dropPercent * 10) / 10,
    monthsOfDecline,
  };
}

// ---------------------------------------------------------------------------
// Debt analysis
// ---------------------------------------------------------------------------

function analyzeDebtPayments(monthlyData: MonthlyData[], transactions: TransactionInput[]): DebtPaymentAnalysis {
  const avgDebt = mean(monthlyData.map((m) => m.debtPayments));
  const avgIncome = mean(monthlyData.map((m) => m.totalDeposits));
  const dti = avgIncome > 0 ? avgDebt / avgIncome : 0;

  const loanKeywords = /student loan|sallie mae|navient|sofi|mohela|nelnet|fedloan|great lakes|aidvantage|dept.* ?ed/i;
  const studentLoanTxs = transactions.filter((t) =>
    !t.isIncomeDeposit && (
      loanKeywords.test(t.merchantName ?? '') ||
      loanKeywords.test(t.name ?? '') ||
      (t.vividCategory === 'debt_payment' && loanKeywords.test((t.merchantName ?? '') + (t.name ?? '')))
    ),
  );

  let estimatedPayment = 0;
  if (studentLoanTxs.length >= 2) {
    estimatedPayment = mean(studentLoanTxs.map((t) => Math.abs(t.amount)));
  }

  const isAtRisk = dti > 0.35 || (estimatedPayment > 0 && avgIncome > 0 && estimatedPayment / avgIncome > 0.15);

  return {
    averageMonthlyDebt: Math.round(avgDebt),
    debtToIncomeRatio: Math.round(dti * 1000) / 1000,
    estimatedStudentLoanPayment: Math.round(estimatedPayment),
    isAtRisk,
  };
}

// ---------------------------------------------------------------------------
// Risk assessment
// ---------------------------------------------------------------------------

function computeRiskLevel(income: IncomeAnalysis, debt: DebtPaymentAnalysis): RiskLevel {
  let score = 0;

  if (income.incomeDropPercent > 30) score += 3;
  else if (income.incomeDropPercent > 15) score += 2;
  else if (income.incomeDropPercent > 5) score += 1;

  if (income.incomeTrend === 'declining') score += 2;
  if (income.incomeTrend === 'volatile') score += 1;
  if (income.monthsOfDecline >= 3) score += 2;

  if (debt.debtToIncomeRatio > 0.5) score += 3;
  else if (debt.debtToIncomeRatio > 0.35) score += 2;
  else if (debt.debtToIncomeRatio > 0.2) score += 1;

  if (debt.isAtRisk) score += 1;

  if (score >= 8) return 'critical';
  if (score >= 6) return 'high';
  if (score >= 4) return 'elevated';
  if (score >= 2) return 'moderate';
  return 'low';
}

// ---------------------------------------------------------------------------
// Alert generation
// ---------------------------------------------------------------------------

function generateAlerts(income: IncomeAnalysis, debt: DebtPaymentAnalysis, risk: RiskLevel): ShieldAlert[] {
  const alerts: ShieldAlert[] = [];

  if (income.incomeDropPercent > 15) {
    alerts.push({
      riskLevel: income.incomeDropPercent > 30 ? 'critical' : 'elevated',
      title: 'Significant Income Drop Detected',
      description: `Your recent income is ${income.incomeDropPercent.toFixed(1)}% below your average ($${income.recentMonthlyIncome.toLocaleString()}/mo vs $${income.averageMonthlyIncome.toLocaleString()}/mo). This increases the risk of missed payments.`,
      recommendation: 'Consider applying for Income-Driven Repayment (IDR) immediately to reduce monthly payment to a percentage of discretionary income.',
    });
  }

  if (income.incomeTrend === 'declining' && income.monthsOfDecline >= 2) {
    alerts.push({
      riskLevel: 'elevated',
      title: 'Income Trending Downward',
      description: `Your income has been declining for ${income.monthsOfDecline} consecutive months. Gig workers and freelancers are especially vulnerable to this pattern.`,
      recommendation: 'Proactively contact your loan servicer before missing a payment. A deferment or forbearance request while current keeps more options open.',
    });
  }

  if (debt.debtToIncomeRatio > 0.35) {
    alerts.push({
      riskLevel: debt.debtToIncomeRatio > 0.5 ? 'high' : 'elevated',
      title: 'High Debt-to-Income Ratio',
      description: `Your DTI is ${(debt.debtToIncomeRatio * 100).toFixed(1)}%, which exceeds the recommended 35% threshold. This leaves little margin for income disruptions.`,
      recommendation: 'IDR plans can reduce your federal student loan payment to 10-20% of discretionary income, significantly improving your DTI ratio.',
    });
  }

  if (debt.estimatedStudentLoanPayment > 0 && income.recentMonthlyIncome > 0) {
    const paymentRatio = debt.estimatedStudentLoanPayment / income.recentMonthlyIncome;
    if (paymentRatio > 0.15) {
      alerts.push({
        riskLevel: paymentRatio > 0.25 ? 'high' : 'elevated',
        title: 'Student Loan Payment Exceeds Safe Threshold',
        description: `Your estimated student loan payment ($${debt.estimatedStudentLoanPayment}/mo) is ${(paymentRatio * 100).toFixed(1)}% of your recent income — above the recommended 10-15%.`,
        recommendation: 'An IDR plan would cap your payment at a percentage of discretionary income, bringing it within sustainable range.',
      });
    }
  }

  if (income.incomeTrend === 'volatile') {
    alerts.push({
      riskLevel: 'moderate',
      title: 'Volatile Income Pattern',
      description: 'Your income fluctuates significantly month-to-month, which is common for gig workers and freelancers but increases default risk.',
      recommendation: 'Build a 2-month payment buffer in a separate account. Consider the SAVE plan which adjusts payments quarterly based on income changes.',
    });
  }

  if (risk === 'low') {
    alerts.push({
      riskLevel: 'low',
      title: 'Loan Health Looks Good',
      description: 'Your income is stable and your debt-to-income ratio is within healthy range. No immediate action needed.',
      recommendation: 'Keep monitoring. If you anticipate income changes (job switch, seasonal work), proactively review your options.',
    });
  }

  return alerts;
}

// ---------------------------------------------------------------------------
// Document generation with Hedera stamping
// ---------------------------------------------------------------------------

async function stampDocument(content: string, userId: string, docType: string): Promise<{
  hash: string; txId: string | null; timestamp: string | null;
}> {
  const hash = createHash('sha256').update(content, 'utf8').digest('hex');

  if (!env.HEDERA_TOPIC_ID || !env.HEDERA_ACCOUNT_ID) {
    return { hash, txId: null, timestamp: null };
  }

  try {
    const client = createHederaClient();
    const topicId = TopicId.fromString(env.HEDERA_TOPIC_ID);
    const userHash = createHash('sha256').update(userId, 'utf8').digest('hex');

    const message = JSON.stringify({
      type: 'LOAN_SHIELD_DOCUMENT',
      docType,
      documentHash: hash,
      userIdHash: userHash,
      timestamp: new Date().toISOString(),
      version: '1.0',
    });

    const submitTx = new TopicMessageSubmitTransaction().setTopicId(topicId).setMessage(message);
    const txResponse = await submitTx.execute(client);
    await txResponse.getReceipt(client);

    return {
      hash,
      txId: txResponse.transactionId.toString(),
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    logger.warn('[loan-shield] Hedera stamp failed for document', {
      error: err instanceof Error ? err.message : String(err),
    });
    return { hash, txId: null, timestamp: null };
  }
}

async function generateIDRApplication(
  userName: string,
  income: IncomeAnalysis,
  debt: DebtPaymentAnalysis,
  userId: string,
): Promise<DocumentDraft> {
  const today = new Date().toISOString().slice(0, 10);
  const content = `INCOME-DRIVEN REPAYMENT (IDR) PLAN APPLICATION
============================================================
Prepared by Vivid Financial Twin | ${today}
Hedera-Verified Digital Document

APPLICANT INFORMATION
Name: ${userName}
Date: ${today}
Application Type: Income-Driven Repayment Plan Request

FINANCIAL SUMMARY (Verified via Plaid)
--------------------------------------------------------------
Average Monthly Income:        $${income.averageMonthlyIncome.toLocaleString()}
Recent Monthly Income (3-mo):  $${income.recentMonthlyIncome.toLocaleString()}
Income Trend:                  ${income.incomeTrend.toUpperCase()}
${income.incomeDropPercent > 0 ? `Income Decline:                ${income.incomeDropPercent.toFixed(1)}%\n` : ''}
Monthly Debt Payments:         $${debt.averageMonthlyDebt.toLocaleString()}
Debt-to-Income Ratio:          ${(debt.debtToIncomeRatio * 100).toFixed(1)}%
Est. Student Loan Payment:     $${debt.estimatedStudentLoanPayment.toLocaleString()}/mo

IDR PLAN REQUEST
--------------------------------------------------------------
I am requesting enrollment in an Income-Driven Repayment plan
due to ${income.incomeDropPercent > 15 ? 'a significant recent decline in my income' : 'my current debt-to-income ratio exceeding sustainable levels'}.

Based on my current financial situation, I request that my
monthly payment be recalculated under the following plans
(in order of preference):

1. SAVE Plan (Saving on a Valuable Education)
   - Caps payment at 5% of discretionary income (undergrad)
   - Projected payment: ~$${Math.round(Math.max(0, income.recentMonthlyIncome - 2000) * 0.05).toLocaleString()}/mo

2. PAYE Plan (Pay As You Earn)
   - Caps payment at 10% of discretionary income
   - Projected payment: ~$${Math.round(Math.max(0, income.recentMonthlyIncome - 2000) * 0.10).toLocaleString()}/mo

3. IBR Plan (Income-Based Repayment)
   - Caps payment at 10-15% of discretionary income
   - Projected payment: ~$${Math.round(Math.max(0, income.recentMonthlyIncome - 2000) * 0.15).toLocaleString()}/mo

SUPPORTING EVIDENCE
--------------------------------------------------------------
This application is supported by verified financial data from
Vivid Financial Twin, which analyzes ${income.averageMonthlyIncome > 0 ? 'real bank transaction data' : 'financial records'}
via Plaid integration. The data integrity is cryptographically
verified and stamped on the Hedera Consensus Service.

SIGNATURE
--------------------------------------------------------------
Applicant: ____________________________
           ${userName}

Date:      ${today}

[This document has been cryptographically hashed and recorded
on the Hedera Consensus Service for tamper-proof verification]`;

  const stamp = await stampDocument(content, userId, 'idr_application');

  return {
    type: 'idr_application',
    title: 'Income-Driven Repayment Plan Application',
    description: 'Pre-filled IDR application based on your verified financial data. Review, sign, and send to your loan servicer.',
    content,
    hederaHash: stamp.hash,
    hederaTransactionId: stamp.txId,
    hederaTimestamp: stamp.timestamp,
  };
}

async function generateDefermentRequest(
  userName: string,
  income: IncomeAnalysis,
  debt: DebtPaymentAnalysis,
  userId: string,
): Promise<DocumentDraft> {
  const today = new Date().toISOString().slice(0, 10);
  const content = `ECONOMIC HARDSHIP DEFERMENT REQUEST
============================================================
Prepared by Vivid Financial Twin | ${today}
Hedera-Verified Digital Document

APPLICANT INFORMATION
Name: ${userName}
Date: ${today}
Request Type: Economic Hardship Deferment

FINANCIAL HARDSHIP EVIDENCE (Verified via Plaid)
--------------------------------------------------------------
Average Monthly Income:        $${income.averageMonthlyIncome.toLocaleString()}
Recent Monthly Income:         $${income.recentMonthlyIncome.toLocaleString()}
Income Decline:                ${income.incomeDropPercent.toFixed(1)}% from average
Income Trend:                  ${income.incomeTrend.toUpperCase()} (${income.monthsOfDecline} months declining)
Debt-to-Income Ratio:          ${(debt.debtToIncomeRatio * 100).toFixed(1)}%

DEFERMENT REQUEST
--------------------------------------------------------------
I am requesting an economic hardship deferment due to a
${income.incomeDropPercent > 30 ? 'severe' : 'significant'} decline in my income.

My recent monthly income of $${income.recentMonthlyIncome.toLocaleString()} is
${income.incomeDropPercent.toFixed(1)}% below my historical average, making it
difficult to maintain my current payment obligations while
covering essential living expenses.

I request deferment for a period of 6 months, during which
I will work to stabilize my income and financial situation.

SUPPORTING EVIDENCE
--------------------------------------------------------------
Financial data verified by Vivid Financial Twin via secure
Plaid bank integration. Document integrity verified on the
Hedera Consensus Service.

SIGNATURE
--------------------------------------------------------------
Applicant: ____________________________
           ${userName}

Date:      ${today}

[Hedera-verified document]`;

  const stamp = await stampDocument(content, userId, 'deferment_request');

  return {
    type: 'deferment_request',
    title: 'Economic Hardship Deferment Request',
    description: 'Pre-filled deferment request documenting your income decline. Pauses payments while you stabilize.',
    content,
    hederaHash: stamp.hash,
    hederaTransactionId: stamp.txId,
    hederaTimestamp: stamp.timestamp,
  };
}

async function generateForbearanceRequest(
  userName: string,
  income: IncomeAnalysis,
  userId: string,
): Promise<DocumentDraft> {
  const today = new Date().toISOString().slice(0, 10);
  const content = `GENERAL FORBEARANCE REQUEST
============================================================
Prepared by Vivid Financial Twin | ${today}
Hedera-Verified Digital Document

APPLICANT INFORMATION
Name: ${userName}
Date: ${today}
Request Type: General Forbearance

FINANCIAL SITUATION
--------------------------------------------------------------
This is an emergency forbearance request due to critical
financial hardship. My income has declined ${income.incomeDropPercent.toFixed(1)}%
and I am at immediate risk of default.

Recent Monthly Income: $${income.recentMonthlyIncome.toLocaleString()}
Income Trend: ${income.incomeTrend.toUpperCase()}

I request a temporary suspension or reduction of payments
for up to 12 months while I address my financial situation.

IMPORTANT NOTE: I understand that interest continues to
accrue during forbearance and will be capitalized. I am
requesting this as a last resort to avoid default, which
would have far more severe consequences.

SIGNATURE
--------------------------------------------------------------
Applicant: ____________________________
           ${userName}

Date:      ${today}

[Hedera-verified document]`;

  const stamp = await stampDocument(content, userId, 'forbearance_request');

  return {
    type: 'forbearance_request',
    title: 'Emergency Forbearance Request',
    description: 'Last-resort forbearance request for critical situations. Stops payments temporarily to prevent default.',
    content,
    hederaHash: stamp.hash,
    hederaTransactionId: stamp.txId,
    hederaTimestamp: stamp.timestamp,
  };
}

// ---------------------------------------------------------------------------
// AI insight
// ---------------------------------------------------------------------------

async function generateShieldInsight(
  income: IncomeAnalysis,
  debt: DebtPaymentAnalysis,
  risk: RiskLevel,
  alerts: ShieldAlert[],
  userName: string,
): Promise<string | null> {
  try {
    const { VertexAI } = await import('@google-cloud/vertexai');
    const vertexAI = new VertexAI({ project: env.GCP_PROJECT_ID, location: env.VERTEX_AI_LOCATION });
    const model = vertexAI.getGenerativeModel({
      model: env.VERTEX_AI_MODEL,
      generationConfig: { temperature: 0.7, topP: 0.9, maxOutputTokens: 1024 },
      systemInstruction: `You are Vivid's Student Loan Shield AI advisor. Analyze the user's income and debt situation and provide empathetic, actionable guidance. Focus on preventing default and protecting their credit score. Mention specific programs (SAVE, PAYE, IBR, deferment, forbearance) when appropriate. Be warm but direct. 2-3 paragraphs.`,
    });

    const alertSummary = alerts.map((a) => `[${a.riskLevel.toUpperCase()}] ${a.title}: ${a.description}`).join('\n');

    const prompt = `USER: ${userName}
RISK LEVEL: ${risk.toUpperCase()}

INCOME:
- Average: $${income.averageMonthlyIncome}/mo
- Recent: $${income.recentMonthlyIncome}/mo
- Trend: ${income.incomeTrend}
- Drop: ${income.incomeDropPercent}%

DEBT:
- Monthly payments: $${debt.averageMonthlyDebt}/mo
- DTI ratio: ${(debt.debtToIncomeRatio * 100).toFixed(1)}%
- Est. student loan: $${debt.estimatedStudentLoanPayment}/mo

ALERTS:
${alertSummary}

Provide a personalized analysis and action plan.`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    return result.response.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  } catch (err) {
    logger.warn('[loan-shield] Vertex AI unavailable', {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
