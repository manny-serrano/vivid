import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WrappedCard {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  stat?: string;
  statLabel?: string;
  secondaryStat?: string;
  secondaryLabel?: string;
  narrative: string;
  gradient: string;
  icon: string;
  items?: Array<{ label: string; value: string; color?: string }>;
}

export interface WrappedData {
  userName: string;
  year: number;
  generatedAt: string;
  cards: WrappedCard[];
}

// ---------------------------------------------------------------------------
// Gradient presets for visual variety
// ---------------------------------------------------------------------------

const GRADIENTS = [
  'from-violet-600 via-purple-500 to-fuchsia-500',
  'from-cyan-500 via-blue-500 to-indigo-600',
  'from-emerald-500 via-green-500 to-teal-500',
  'from-amber-500 via-orange-500 to-red-500',
  'from-rose-500 via-pink-500 to-purple-500',
  'from-sky-400 via-blue-400 to-violet-500',
  'from-lime-400 via-emerald-500 to-cyan-500',
  'from-fuchsia-500 via-rose-400 to-orange-400',
  'from-indigo-500 via-purple-400 to-pink-400',
  'from-teal-400 via-cyan-400 to-blue-500',
];

// ---------------------------------------------------------------------------
// Core
// ---------------------------------------------------------------------------

export async function generateWrapped(userId: string): Promise<WrappedData> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  const twin = await prisma.twin.findUnique({
    where: { userId },
    include: { transactions: true },
  });
  if (!twin) throw new Error('Twin not found — connect your bank first');

  const now = new Date();
  const year = now.getFullYear();
  const userName = `${user.firstName} ${user.lastName}`;

  const [snapshots, goals, notifications, attestations] = await Promise.all([
    prisma.twinSnapshot.findMany({
      where: { userId },
      orderBy: { snapshotAt: 'asc' },
    }),
    prisma.goal.findMany({
      where: { userId },
      include: { milestones: true },
    }),
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.attestation.findMany({
      where: { userId, revokedAt: null },
    }),
  ]);

  const txs = twin.transactions;
  const spending = txs.filter((t) => !t.isIncomeDeposit);
  const income = txs.filter((t) => t.isIncomeDeposit);

  const totalIncome = income.reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalSpending = spending.reduce((s, t) => s + Math.abs(t.amount), 0);

  // Category breakdown
  const catMap = new Map<string, number>();
  for (const t of spending) {
    const cat = t.vividCategory;
    catMap.set(cat, (catMap.get(cat) ?? 0) + Math.abs(t.amount));
  }
  const topCategories = [...catMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Top merchants
  const merchantMap = new Map<string, number>();
  for (const t of spending) {
    const name = t.merchantName ?? 'Unknown';
    merchantMap.set(name, (merchantMap.get(name) ?? 0) + Math.abs(t.amount));
  }
  const topMerchants = [...merchantMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Score journey
  const earliest = snapshots[0];
  const latest = snapshots[snapshots.length - 1];
  const startScore = earliest?.overallScore ?? twin.overallScore;
  const endScore = twin.overallScore;
  const scoreDelta = endScore - startScore;

  // Pillar improvements
  const pillarStart = earliest ?? twin;
  const pillars = [
    { name: 'Income Stability', start: pillarStart.incomeStabilityScore, end: twin.incomeStabilityScore },
    { name: 'Spending Discipline', start: pillarStart.spendingDisciplineScore, end: twin.spendingDisciplineScore },
    { name: 'Debt Trajectory', start: pillarStart.debtTrajectoryScore, end: twin.debtTrajectoryScore },
    { name: 'Financial Resilience', start: pillarStart.financialResilienceScore, end: twin.financialResilienceScore },
    { name: 'Growth Momentum', start: pillarStart.growthMomentumScore, end: twin.growthMomentumScore },
  ];
  const bestPillar = pillars.reduce((best, p) => (p.end - p.start > best.end - best.start ? p : best), pillars[0]);
  const worstPillar = pillars.reduce((worst, p) => (p.end - p.start < worst.end - worst.start ? p : worst), pillars[0]);

  // Goals
  const completedGoals = goals.filter((g) => g.status === 'COMPLETED');
  const activeGoals = goals.filter((g) => g.status === 'ACTIVE');

  // Milestones
  const milestoneCount = notifications.filter((n) => n.type === 'SCORE_MILESTONE').length;

  // Recurring merchants
  const recurringTxs = spending.filter((t) => t.isRecurring);
  const recurringTotal = recurringTxs.reduce((s, t) => s + Math.abs(t.amount), 0);

  // Biggest single transaction
  const biggestTx = spending.reduce(
    (max, t) => (Math.abs(t.amount) > Math.abs(max.amount) ? t : max),
    spending[0] ?? { amount: 0, merchantName: 'None', date: '' },
  );

  // Savings rate
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalSpending) / totalIncome) * 100 : 0;

  // Build cards
  const cards: WrappedCard[] = [];
  let gi = 0;
  const nextGradient = () => GRADIENTS[gi++ % GRADIENTS.length];

  // Card 1: The Opener
  cards.push({
    id: 'intro',
    type: 'intro',
    title: `${user.firstName}'s ${year} Financial Story`,
    subtitle: 'Your year in numbers, powered by Vivid',
    narrative: `This is the story of your money in ${year}. ${txs.length.toLocaleString()} transactions. ${twin.analysisMonths} months. One Financial Twin. Let's see what happened.`,
    gradient: nextGradient(),
    icon: 'sparkles',
    stat: txs.length.toLocaleString(),
    statLabel: 'Transactions Analyzed',
  });

  // Card 2: Score Journey
  cards.push({
    id: 'score-journey',
    type: 'score',
    title: scoreDelta >= 0 ? 'Your Score Climbed' : 'Your Score Shifted',
    stat: Math.round(endScore).toString(),
    statLabel: 'Vivid Score',
    secondaryStat: `${scoreDelta >= 0 ? '+' : ''}${Math.round(scoreDelta)}`,
    secondaryLabel: 'Change',
    narrative: scoreDelta >= 5
      ? `You started at ${Math.round(startScore)} and climbed to ${Math.round(endScore)}. That's real, measurable progress that lenders can see.`
      : scoreDelta >= 0
      ? `Your score held steady at ${Math.round(endScore)}. Consistency is its own kind of strength.`
      : `Your score shifted from ${Math.round(startScore)} to ${Math.round(endScore)}. Every dip is a setup for a comeback.`,
    gradient: nextGradient(),
    icon: 'trending-up',
    items: pillars.map((p) => ({
      label: p.name,
      value: `${Math.round(p.end)}`,
      color: p.end >= 70 ? 'text-emerald-400' : p.end >= 50 ? 'text-amber-400' : 'text-rose-400',
    })),
  });

  // Card 3: Biggest Strength
  cards.push({
    id: 'best-pillar',
    type: 'highlight',
    title: 'Your Biggest Strength',
    stat: Math.round(bestPillar.end).toString(),
    statLabel: bestPillar.name,
    secondaryStat: `+${Math.round(Math.max(0, bestPillar.end - bestPillar.start))}`,
    secondaryLabel: 'Points gained',
    narrative: `${bestPillar.name} was where you really shone. At ${Math.round(bestPillar.end)}/100, this is the pillar that tells lenders you mean business.`,
    gradient: nextGradient(),
    icon: 'trophy',
  });

  // Card 4: Money Flow
  cards.push({
    id: 'money-flow',
    type: 'flow',
    title: 'Where Your Money Went',
    stat: `$${Math.round(totalSpending).toLocaleString()}`,
    statLabel: 'Total Spending',
    secondaryStat: `$${Math.round(totalIncome).toLocaleString()}`,
    secondaryLabel: 'Total Income',
    narrative: savingsRate > 20
      ? `You saved ${Math.round(savingsRate)}% of your income. That's elite-level discipline.`
      : savingsRate > 10
      ? `You saved ${Math.round(savingsRate)}% of your income — solid, but there's room to push higher.`
      : savingsRate > 0
      ? `You saved ${Math.round(savingsRate)}% of your income. Every dollar saved is a dollar working for your future.`
      : `Your spending exceeded your income this period. Let's build a plan to turn that around.`,
    gradient: nextGradient(),
    icon: 'dollar-sign',
    items: topCategories.map(([cat, amt]) => ({
      label: cat.replace(/_/g, ' '),
      value: `$${Math.round(amt).toLocaleString()}`,
    })),
  });

  // Card 5: Top Merchants
  cards.push({
    id: 'top-merchants',
    type: 'list',
    title: 'Your Top Merchants',
    narrative: `${topMerchants[0]?.[0] ?? 'Unknown'} got more of your money than anyone else — $${Math.round(topMerchants[0]?.[1] ?? 0).toLocaleString()} total. Here's where the rest went.`,
    gradient: nextGradient(),
    icon: 'store',
    items: topMerchants.map(([name, amt], i) => ({
      label: `#${i + 1} ${name}`,
      value: `$${Math.round(amt).toLocaleString()}`,
    })),
  });

  // Card 6: Recurring Bills
  cards.push({
    id: 'recurring',
    type: 'stat',
    title: 'On Autopilot',
    stat: `$${Math.round(recurringTotal).toLocaleString()}`,
    statLabel: 'Recurring Spending',
    secondaryStat: recurringTxs.length.toString(),
    secondaryLabel: 'Recurring Charges',
    narrative: `$${Math.round(recurringTotal).toLocaleString()} went to subscriptions and recurring bills. That's money leaving your account whether you think about it or not.`,
    gradient: nextGradient(),
    icon: 'repeat',
  });

  // Card 7: Biggest Transaction
  if (biggestTx && Math.abs(biggestTx.amount) > 0) {
    cards.push({
      id: 'biggest-purchase',
      type: 'highlight',
      title: 'Your Biggest Single Spend',
      stat: `$${Math.round(Math.abs(biggestTx.amount)).toLocaleString()}`,
      statLabel: biggestTx.merchantName ?? 'Unknown',
      narrative: `On ${new Date(biggestTx.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}, you made your single largest transaction: $${Math.round(Math.abs(biggestTx.amount)).toLocaleString()} at ${biggestTx.merchantName ?? 'a merchant'}. Big moves.`,
      gradient: nextGradient(),
      icon: 'zap',
    });
  }

  // Card 8: Goals
  if (goals.length > 0) {
    cards.push({
      id: 'goals',
      type: 'goals',
      title: 'Your Goals',
      stat: completedGoals.length.toString(),
      statLabel: 'Goals Completed',
      secondaryStat: activeGoals.length.toString(),
      secondaryLabel: 'Still In Progress',
      narrative: completedGoals.length > 0
        ? `You set ${goals.length} financial goals and crushed ${completedGoals.length} of them. That's ${Math.round((completedGoals.length / goals.length) * 100)}% completion rate.`
        : `You set ${goals.length} financial goals. The journey is the reward — keep pushing.`,
      gradient: nextGradient(),
      icon: 'target',
      items: goals.slice(0, 5).map((g) => ({
        label: g.title,
        value: g.status === 'COMPLETED' ? 'Completed' : `${Math.round((g.currentValue / g.targetValue) * 100)}%`,
        color: g.status === 'COMPLETED' ? 'text-emerald-400' : 'text-amber-400',
      })),
    });
  }

  // Card 9: Trust & Reputation
  if (attestations.length > 0) {
    cards.push({
      id: 'trust',
      type: 'trust',
      title: 'Your Trust Network',
      stat: attestations.length.toString(),
      statLabel: 'Verified Attestations',
      narrative: `${attestations.length} organization${attestations.length > 1 ? 's' : ''} verified your financial behavior on-chain. That's decentralized proof that you're the real deal.`,
      gradient: nextGradient(),
      icon: 'shield-check',
    });
  }

  // Card 10: Area of Growth
  cards.push({
    id: 'growth-area',
    type: 'growth',
    title: 'Room to Grow',
    stat: Math.round(worstPillar.end).toString(),
    statLabel: worstPillar.name,
    narrative: `${worstPillar.name} is your biggest opportunity — it's at ${Math.round(worstPillar.end)}/100. Improving this pillar could unlock better loan rates and higher overall score.`,
    gradient: nextGradient(),
    icon: 'arrow-up-right',
  });

  // Card 11: AI Insights (generated by Gemini)
  const aiInsights = await generateWrappedInsights(userName, {
    score: Math.round(endScore),
    scoreDelta: Math.round(scoreDelta),
    totalSpending: Math.round(totalSpending),
    totalIncome: Math.round(totalIncome),
    savingsRate: Math.round(savingsRate),
    topCategory: topCategories[0]?.[0] ?? 'unknown',
    topMerchant: topMerchants[0]?.[0] ?? 'Unknown',
    goalsCompleted: completedGoals.length,
    totalGoals: goals.length,
    bestPillar: bestPillar.name,
    worstPillar: worstPillar.name,
    transactionCount: txs.length,
    attestationCount: attestations.length,
    milestoneCount,
  });

  if (aiInsights) {
    cards.push({
      id: 'ai-insights',
      type: 'ai',
      title: 'What the AI Sees',
      narrative: aiInsights,
      gradient: nextGradient(),
      icon: 'brain',
    });
  }

  // Card 12: Finale
  cards.push({
    id: 'finale',
    type: 'finale',
    title: `${Math.round(endScore)}`,
    subtitle: 'Your Vivid Score',
    narrative: `This is your financial identity — verified, blockchain-anchored, and uniquely yours. No credit bureau needed. Share it with the world.`,
    gradient: GRADIENTS[0],
    icon: 'sparkles',
    stat: Math.round(endScore).toString(),
    statLabel: 'Vivid Score',
    items: pillars.map((p) => ({
      label: p.name,
      value: `${Math.round(p.end)}/100`,
      color: p.end >= 70 ? 'text-emerald-400' : p.end >= 50 ? 'text-amber-400' : 'text-rose-400',
    })),
  });

  return {
    userName,
    year,
    generatedAt: new Date().toISOString(),
    cards,
  };
}

// ---------------------------------------------------------------------------
// Gemini-powered insight generation
// ---------------------------------------------------------------------------

async function generateWrappedInsights(
  userName: string,
  stats: Record<string, string | number>,
): Promise<string | null> {
  try {
    const { VertexAI } = await import('@google-cloud/vertexai');
    const vertexAI = new VertexAI({ project: env.GCP_PROJECT_ID, location: env.VERTEX_AI_LOCATION });
    const model = vertexAI.getGenerativeModel({
      model: env.VERTEX_AI_MODEL,
      generationConfig: { temperature: 0.8, topP: 0.9, maxOutputTokens: 512 },
    });

    const prompt = `You are Vivid's AI, writing a "Year in Review" insight card for ${userName}. 
Write exactly 3 short, punchy sentences — each on its own line. One should be the most surprising insight, one should be the most impressive achievement, and one should be actionable advice for next year.

Stats:
- Vivid Score: ${stats.score} (change: ${stats.scoreDelta > 0 ? '+' : ''}${stats.scoreDelta})
- Total income: $${Number(stats.totalIncome).toLocaleString()}
- Total spending: $${Number(stats.totalSpending).toLocaleString()}
- Savings rate: ${stats.savingsRate}%
- Top spending category: ${stats.topCategory}
- Top merchant: ${stats.topMerchant}
- Goals completed: ${stats.goalsCompleted}/${stats.totalGoals}
- Strongest pillar: ${stats.bestPillar}
- Weakest pillar: ${stats.worstPillar}
- Transactions analyzed: ${stats.transactionCount}
- Verified attestations: ${stats.attestationCount}

Be warm, specific, and personal. Don't be generic. Reference actual numbers. No bullet points or labels — just 3 sentences.`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    return result.response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;
  } catch (err) {
    logger.warn('[wrapped] Vertex AI unavailable', { error: err instanceof Error ? err.message : String(err) });
    return `Your Vivid score of ${stats.score} puts you on a clear upward trajectory. With ${stats.goalsCompleted} goals completed and ${stats.attestationCount} verified attestations, your financial identity is getting stronger every day. Next year, focus on ${stats.worstPillar} to unlock your full potential.`;
  }
}
