import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function monthsAgo(n: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  d.setDate(1);
  return d;
}

function randomDay(month: Date): Date {
  const y = month.getFullYear();
  const m = month.getMonth();
  const maxDay = new Date(y, m + 1, 0).getDate();
  const day = Math.floor(Math.random() * maxDay) + 1;
  return new Date(y, m, day);
}

function id(): string {
  return Math.random().toString(36).slice(2, 12);
}

interface TxSeed {
  amount: number;
  merchant: string;
  category: string;
  isIncome: boolean;
  isRecurring: boolean;
}

function generateMarcusMonth(monthIdx: number): TxSeed[] {
  const baseUber = 1800 + monthIdx * 30 + Math.random() * 300;
  const baseLyft = 900 + monthIdx * 20 + Math.random() * 200;
  const taskRabbit = monthIdx > 5 ? 400 + Math.random() * 200 : 0;

  const txs: TxSeed[] = [
    { amount: -baseUber, merchant: 'Uber Driver Payment', category: 'income', isIncome: true, isRecurring: true },
    { amount: -baseLyft, merchant: 'Lyft Driver Earnings', category: 'income', isIncome: true, isRecurring: true },
  ];

  if (taskRabbit > 0) {
    txs.push({ amount: -taskRabbit, merchant: 'TaskRabbit Payout', category: 'income', isIncome: true, isRecurring: false });
  }

  txs.push(
    { amount: 1200, merchant: 'Landlord - Rent', category: 'rent', isIncome: false, isRecurring: true },
    { amount: 280 + Math.random() * 40, merchant: 'Kroger', category: 'groceries', isIncome: false, isRecurring: true },
    { amount: 95 + Math.random() * 15, merchant: 'T-Mobile', category: 'utilities', isIncome: false, isRecurring: true },
    { amount: 120 + Math.random() * 20, merchant: 'Duke Energy', category: 'utilities', isIncome: false, isRecurring: true },
    { amount: 85, merchant: 'Progressive Insurance', category: 'insurance', isIncome: false, isRecurring: true },
    { amount: 50 + Math.random() * 30, merchant: 'Shell Gas', category: 'transportation', isIncome: false, isRecurring: false },
    { amount: 45 + Math.random() * 25, merchant: 'Amazon', category: 'shopping', isIncome: false, isRecurring: false },
    { amount: 12.99, merchant: 'Netflix', category: 'subscriptions', isIncome: false, isRecurring: true },
    { amount: 25 + Math.random() * 20, merchant: 'Chipotle', category: 'dining', isIncome: false, isRecurring: false },
  );

  if (monthIdx > 8) {
    txs.push({ amount: -200, merchant: 'Savings Transfer', category: 'savings_transfer', isIncome: false, isRecurring: true });
  }

  return txs;
}

function generateSarahMonth(monthIdx: number): TxSeed[] {
  const salary = 6500;
  const txs: TxSeed[] = [
    { amount: -salary, merchant: 'Acme Corp Direct Deposit', category: 'income', isIncome: true, isRecurring: true },
    { amount: 2200, merchant: 'Landlord - Rent', category: 'rent', isIncome: false, isRecurring: true },
    { amount: 350 + Math.random() * 50, merchant: 'Whole Foods', category: 'groceries', isIncome: false, isRecurring: true },
    { amount: 140, merchant: 'Verizon', category: 'utilities', isIncome: false, isRecurring: true },
    { amount: 85, merchant: 'ConEd', category: 'utilities', isIncome: false, isRecurring: true },
    { amount: 180, merchant: 'GEICO', category: 'insurance', isIncome: false, isRecurring: true },
    // High discretionary
    { amount: 250 + Math.random() * 150, merchant: 'Nobu Restaurant', category: 'dining', isIncome: false, isRecurring: false },
    { amount: 120 + Math.random() * 80, merchant: 'DoorDash', category: 'dining', isIncome: false, isRecurring: false },
    { amount: 180 + Math.random() * 120, merchant: 'Nordstrom', category: 'shopping', isIncome: false, isRecurring: false },
    { amount: 300 + Math.random() * 200, merchant: 'Sephora', category: 'shopping', isIncome: false, isRecurring: false },
    { amount: 80 + Math.random() * 40, merchant: 'SoulCycle', category: 'entertainment', isIncome: false, isRecurring: true },
    // Subscriptions (many)
    { amount: 15.99, merchant: 'Netflix', category: 'subscriptions', isIncome: false, isRecurring: true },
    { amount: 14.99, merchant: 'Spotify', category: 'subscriptions', isIncome: false, isRecurring: true },
    { amount: 12.99, merchant: 'Hulu', category: 'subscriptions', isIncome: false, isRecurring: true },
    { amount: 9.99, merchant: 'Apple iCloud', category: 'subscriptions', isIncome: false, isRecurring: true },
    { amount: 19.99, merchant: 'HBO Max', category: 'subscriptions', isIncome: false, isRecurring: true },
    { amount: 14.99, merchant: 'Adobe CC', category: 'subscriptions', isIncome: false, isRecurring: true },
    { amount: 10.99, merchant: 'NYT Digital', category: 'subscriptions', isIncome: false, isRecurring: true },
    { amount: 16.99, merchant: 'ClassPass', category: 'subscriptions', isIncome: false, isRecurring: true },
    { amount: 11.99, merchant: 'Headspace', category: 'subscriptions', isIncome: false, isRecurring: true },
    // Credit card payments
    { amount: 350, merchant: 'Chase CC Payment', category: 'debt_payment', isIncome: false, isRecurring: true },
    { amount: 200, merchant: 'Amex CC Payment', category: 'debt_payment', isIncome: false, isRecurring: true },
  ];

  if (monthIdx % 3 === 0) {
    txs.push({ amount: 400 + Math.random() * 300, merchant: 'Delta Airlines', category: 'entertainment', isIncome: false, isRecurring: false });
  }

  return txs;
}

async function main() {
  // Clean existing data
  await prisma.transaction.deleteMany();
  await prisma.shareToken.deleteMany();
  await prisma.twin.deleteMany();
  await prisma.institution.deleteMany();
  await prisma.user.deleteMany();

  const sunrise = await prisma.institution.create({
    data: {
      name: 'Sunrise Credit Union',
      type: 'CREDIT_UNION',
      email: 'lo@sunrise-cu.org',
      firebaseUid: 'demo-institution-uid',
    },
  });

  const marcus = await prisma.user.create({
    data: {
      firebaseUid: 'marcus-demo-uid',
      email: 'marcus@demo.vivid.dev',
      firstName: 'Marcus',
      lastName: 'Johnson',
      hasPlaidConnection: true,
    },
  });

  const sarah = await prisma.user.create({
    data: {
      firebaseUid: 'sarah-demo-uid',
      email: 'sarah@demo.vivid.dev',
      firstName: 'Sarah',
      lastName: 'Chen',
      hasPlaidConnection: true,
    },
  });

  // Build Marcus transactions (18 months)
  const marcusTxs: Array<{
    userId: string;
    plaidTransactionId: string;
    amount: number;
    date: Date;
    merchantName: string;
    originalCategory: string[];
    vividCategory: string;
    isRecurring: boolean;
    isIncomeDeposit: boolean;
    isBusinessExpense: boolean;
    confidenceScore: number;
  }> = [];

  for (let m = 17; m >= 0; m--) {
    const month = monthsAgo(m);
    for (const tx of generateMarcusMonth(17 - m)) {
      marcusTxs.push({
        userId: marcus.id,
        plaidTransactionId: `marcus-${id()}-${m}`,
        amount: tx.amount,
        date: randomDay(month),
        merchantName: tx.merchant,
        originalCategory: [tx.category],
        vividCategory: tx.category,
        isRecurring: tx.isRecurring,
        isIncomeDeposit: tx.isIncome,
        isBusinessExpense: false,
        confidenceScore: 0.92,
      });
    }
  }

  // Build Sarah transactions (18 months)
  const sarahTxs: typeof marcusTxs = [];
  for (let m = 17; m >= 0; m--) {
    const month = monthsAgo(m);
    for (const tx of generateSarahMonth(17 - m)) {
      sarahTxs.push({
        userId: sarah.id,
        plaidTransactionId: `sarah-${id()}-${m}`,
        amount: tx.amount,
        date: randomDay(month),
        merchantName: tx.merchant,
        originalCategory: [tx.category],
        vividCategory: tx.category,
        isRecurring: tx.isRecurring,
        isIncomeDeposit: tx.isIncome,
        isBusinessExpense: false,
        confidenceScore: 0.89,
      });
    }
  }

  const marcusTwin = await prisma.twin.create({
    data: {
      userId: marcus.id,
      incomeStabilityScore: 72,
      spendingDisciplineScore: 88,
      debtTrajectoryScore: 85,
      financialResilienceScore: 68,
      growthMomentumScore: 70,
      overallScore: 76.6,
      consumerNarrative:
        "Your financial twin shows strong spending discipline and a clear upward trajectory. You keep essentials in check, avoid debt traps, and your gig income is growing steadily across three platforms — Uber, Lyft, and TaskRabbit.\n\nYour top strength is spending discipline at 88/100. You maintain a low discretionary ratio, consistent rent payments, and recently started regular savings transfers. That's exactly the kind of behavioral signal that traditional credit scores miss.\n\nTo boost your Financial Resilience score from 68 to 80+, aim to build your emergency fund from 2 months to 3-4 months of expenses. Your income growth is impressive — keep diversifying those gig streams.",
      institutionNarrative:
        "APPLICANT FINANCIAL SUMMARY\nAssessment Date: 2026-02-21\nAnalysis Period: 18 months\n\nINCOME ASSESSMENT\nApplicant earns from three gig platforms (Uber, Lyft, TaskRabbit) with combined monthly income averaging $3,400, growing 15% year-over-year. Income variability (CV 0.28) is within acceptable bounds for gig economy workers.\n\nSPENDING BEHAVIOR\nExcellent essential-to-discretionary ratio (0.82). Consistent rent at $1,200/month. Minimal subscription exposure. Savings transfers initiated in recent months.\n\nDEBT POSTURE\nNo credit card debt. No loan obligations detected. Clean debt trajectory.\n\nRISK FACTORS\nNone identified. Thin traditional credit file is the primary concern.\n\nRECOMMENDED LOAN PRODUCTS\nPersonal loan (unsecured up to $10K), Auto loan\n\nLENDING RECOMMENDATION\nFavorable — Confidence: 78%\nDespite thin FICO file, behavioral analysis shows strong financial discipline and improving income trajectory. Standard underwriting recommended.",
      personalLoanReadiness: 78,
      autoLoanReadiness: 76,
      mortgageReadiness: 62,
      smallBizReadiness: 68,
      profileHash: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6abcd',
      hederaTopicId: '0.0.0',
      hederaTransactionId: null,
      hederaTimestamp: null,
      blockchainVerified: false,
      transactionCount: marcusTxs.length,
      analysisMonths: 18,
      transactions: { create: marcusTxs },
    },
  });

  const sarahTwin = await prisma.twin.create({
    data: {
      userId: sarah.id,
      incomeStabilityScore: 85,
      spendingDisciplineScore: 48,
      debtTrajectoryScore: 52,
      financialResilienceScore: 42,
      growthMomentumScore: 58,
      overallScore: 58.3,
      consumerNarrative:
        "Your financial twin shows a stable income foundation — your $6,500 monthly salary is consistent and reliable. That's a real strength, and it puts you ahead on Income Stability at 85/100.\n\nHowever, your spending patterns are eating into your financial health. High discretionary spending at restaurants, retail, and 9+ active subscriptions are keeping your Spending Discipline at 48/100. Combined with credit card balances you're carrying, your Debt Trajectory sits at 52/100.\n\nThe most urgent area: you have no emergency fund. Your Financial Resilience at 42/100 means an unexpected expense could create real financial stress. Start by canceling 3-4 subscriptions and redirecting $200/month into a savings account.",
      institutionNarrative:
        "APPLICANT FINANCIAL SUMMARY\nAssessment Date: 2026-02-21\nAnalysis Period: 18 months\n\nINCOME ASSESSMENT\nSalaried employee with consistent $6,500/month direct deposits from Acme Corp. Zero income variability. No secondary income sources detected.\n\nSPENDING BEHAVIOR\nElevated discretionary spending (dining: ~$400/mo, retail: ~$500/mo). Nine recurring subscriptions totaling $128/month. Essential ratio of 0.52 is below the 0.60 threshold.\n\nDEBT POSTURE\nCarrying credit card balances across two cards (Chase, Amex) with combined minimum payments of $550/month. Debt-to-income ratio: 8.5%. Flat trajectory — debt is neither increasing nor decreasing.\n\nRISK FACTORS\n- No emergency fund or savings transfers detected\n- Subscription sprawl (9 active)\n- Zero investment or savings activity\n\nRECOMMENDED LOAN PRODUCTS\nConditional: Personal loan with spending counseling, Auto loan at standard rates\n\nLENDING RECOMMENDATION\nConditional — Confidence: 62%\nStable income is offset by poor spending discipline and zero liquidity buffer. Recommend secured products or co-signer arrangements.",
      personalLoanReadiness: 58,
      autoLoanReadiness: 62,
      mortgageReadiness: 45,
      smallBizReadiness: 42,
      profileHash: 'f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1efgh',
      hederaTopicId: '0.0.0',
      hederaTransactionId: null,
      hederaTimestamp: null,
      blockchainVerified: false,
      transactionCount: sarahTxs.length,
      analysisMonths: 18,
      transactions: { create: sarahTxs },
    },
  });

  // Share tokens
  await prisma.shareToken.create({
    data: {
      userId: marcus.id,
      twinId: marcusTwin.id,
      token: '00000000-0000-4000-8000-000000000001',
      recipientInstitution: sunrise.name,
      recipientName: 'Sunrise Credit Union',
      showOverallScore: true,
      showDimensionScores: true,
      showNarrative: true,
      showTimeline: true,
      showTransactions: false,
      showLendingReadiness: true,
      showBlockchainProof: true,
    },
  });

  await prisma.shareToken.create({
    data: {
      userId: sarah.id,
      twinId: sarahTwin.id,
      token: '00000000-0000-4000-8000-000000000002',
      recipientInstitution: sunrise.name,
      recipientName: 'Sunrise Credit Union',
      showOverallScore: true,
      showDimensionScores: true,
      showNarrative: true,
      showTimeline: true,
      showTransactions: false,
      showLendingReadiness: true,
      showBlockchainProof: true,
    },
  });

  console.log(`Seed complete:`);
  console.log(`  Marcus (Vivid ${marcusTwin.overallScore}) — ${marcusTxs.length} transactions`);
  console.log(`  Sarah  (Vivid ${sarahTwin.overallScore}) — ${sarahTxs.length} transactions`);
  console.log(`  Institution: ${sunrise.name}`);
  console.log(`  Share tokens: Marcus (..0001), Sarah (..0002)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
