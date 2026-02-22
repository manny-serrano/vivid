// ---------------------------------------------------------------------------
// Vivid – Financial Chatbot powered by full Financial Twin context
// ---------------------------------------------------------------------------

import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScoreContext {
  overall: number;
  incomeStability: number;
  spendingDiscipline: number;
  debtTrajectory: number;
  financialResilience: number;
  growthMomentum: number;
  consumerNarrative: string;
}

export interface TransactionSummary {
  totalTransactions: number;
  monthsAnalyzed: number;
  avgMonthlyIncome: number;
  avgMonthlySpending: number;
  avgMonthlySavings: number;
  topSpendingCategories: { category: string; total: number; count: number }[];
  recurringCharges: { name: string; amount: number }[];
  recentLargeExpenses: { name: string; amount: number; date: string }[];
  debtPaymentInfo: { avgMonthly: number; dtiRatio: number };
  emergencyRunway: number;
  subscriptionCount: number;
  hasPayrollDeposit: boolean;
  incomeSourceCount: number;
  overdraftCount: number;
}

export interface RedFlagSummary {
  redCount: number;
  yellowCount: number;
  topFlags: { title: string; severity: string }[];
}

export interface LendingContext {
  personalLoan: number;
  autoLoan: number;
  mortgage: number;
  smallBiz: number;
}

export interface FullChatContext {
  scores: ScoreContext;
  transactions: TransactionSummary;
  redFlags: RedFlagSummary;
  lending: LendingContext;
  userName: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ---------------------------------------------------------------------------
// System prompt — much richer now
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are Vivid, a deeply knowledgeable financial wellness chatbot with full access to the user's real bank data. You have two voice personalities — "Nova" (warm, encouraging) and "Atlas" (calm, analytical) — but your written answers work for both.

You have access to the user's complete Financial Twin data including their actual transactions, spending patterns, debt info, red flags, and lending readiness. USE THIS DATA to give hyper-specific, personalized answers.

RULES:
- Reference SPECIFIC numbers from their data (e.g., "You spent $847 on dining out last month" not "you spend a lot on food").
- Name actual merchants and categories from their transactions when relevant.
- When giving advice, tie it to their real numbers: "If you cut your $45/mo DoorDash habit, that's $540/year toward your emergency fund."
- Be conversational, warm, and genuinely helpful. 3-6 sentences per response. Go longer if they ask for detail.
- Never shame. Frame everything as opportunity.
- If they ask about loans or mortgage readiness, give them their actual lending readiness scores and what specifically would improve them.
- If they ask "what should I do?", prioritize advice based on their red flags — start with the most impactful fix.
- If they ask about specific spending, reference the actual category data and merchants.
- Use plain language. Define financial terms briefly when used.
- Don't output JSON or code.
- You can discuss any financial topic — budgeting, investing basics, debt strategy, saving tips, tax basics, etc. — always grounding it in their personal data when possible.`;

// ---------------------------------------------------------------------------
// Build the full context block that goes into the system prompt
// ---------------------------------------------------------------------------

function buildContextBlock(ctx: FullChatContext): string {
  const { scores, transactions: tx, redFlags, lending } = ctx;

  const topCategories = tx.topSpendingCategories.slice(0, 8)
    .map((c) => `  - ${c.category}: $${c.total.toLocaleString()} (${c.count} transactions)`)
    .join('\n');

  const recurringList = tx.recurringCharges.slice(0, 10)
    .map((r) => `  - ${r.name}: $${Math.abs(r.amount).toFixed(0)}/mo`)
    .join('\n');

  const largeExpenses = tx.recentLargeExpenses.slice(0, 5)
    .map((e) => `  - ${e.name}: $${Math.abs(e.amount).toFixed(0)} on ${e.date}`)
    .join('\n');

  const flagList = redFlags.topFlags.slice(0, 7)
    .map((f) => `  - [${f.severity.toUpperCase()}] ${f.title}`)
    .join('\n');

  return `
═══════════════════════════════════════════
USER: ${ctx.userName}
═══════════════════════════════════════════

VIVID SCORES:
  Overall: ${scores.overall.toFixed(1)}/100
  Income Stability: ${scores.incomeStability.toFixed(1)}/100
  Spending Discipline: ${scores.spendingDiscipline.toFixed(1)}/100
  Debt Trajectory: ${scores.debtTrajectory.toFixed(1)}/100
  Financial Resilience: ${scores.financialResilience.toFixed(1)}/100
  Growth Momentum: ${scores.growthMomentum.toFixed(1)}/100

FINANCIAL SNAPSHOT:
  Monthly Income (avg): $${tx.avgMonthlyIncome.toLocaleString()}
  Monthly Spending (avg): $${tx.avgMonthlySpending.toLocaleString()}
  Monthly Savings (avg): $${tx.avgMonthlySavings.toLocaleString()}
  Emergency Runway: ${tx.emergencyRunway} months
  Debt-to-Income Ratio: ${(tx.debtPaymentInfo.dtiRatio * 100).toFixed(1)}%
  Avg Monthly Debt Payments: $${tx.debtPaymentInfo.avgMonthly.toLocaleString()}
  Overdraft Events: ${tx.overdraftCount}
  Payroll Deposits: ${tx.hasPayrollDeposit ? 'Yes' : 'No'}
  Income Sources: ${tx.incomeSourceCount}
  Subscriptions: ~${tx.subscriptionCount}
  Transactions Analyzed: ${tx.totalTransactions} over ${tx.monthsAnalyzed} months

TOP SPENDING CATEGORIES:
${topCategories || '  (none)'}

RECURRING CHARGES:
${recurringList || '  (none detected)'}

RECENT LARGE EXPENSES:
${largeExpenses || '  (none)'}

RED FLAGS (what would hurt loan approval):
  ${redFlags.redCount} critical, ${redFlags.yellowCount} warnings
${flagList || '  (none detected)'}

LENDING READINESS:
  Personal Loan: ${lending.personalLoan}/100
  Auto Loan: ${lending.autoLoan}/100
  Mortgage: ${lending.mortgage}/100
  Small Business: ${lending.smallBiz}/100

AI NARRATIVE:
${scores.consumerNarrative.slice(0, 800)}
`.trim();
}

// ---------------------------------------------------------------------------
// Vertex AI call
// ---------------------------------------------------------------------------

async function callVertexChat(
  systemPrompt: string,
  messages: { role: string; content: string }[],
): Promise<string | null> {
  try {
    const { VertexAI } = await import('@google-cloud/vertexai');
    const vertexAI = new VertexAI({ project: env.GCP_PROJECT_ID, location: env.VERTEX_AI_LOCATION });
    const model = vertexAI.getGenerativeModel({
      model: env.VERTEX_AI_MODEL,
      generationConfig: { temperature: 0.8, topP: 0.9, maxOutputTokens: 1024 },
      systemInstruction: systemPrompt,
    });

    const contents = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const result = await model.generateContent({ contents });
    return result.response.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  } catch (err) {
    logger.warn('[chatbot] Vertex AI unavailable, using template responses', {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

// ---------------------------------------------------------------------------
// Helpers for template fallback
// ---------------------------------------------------------------------------

function tier(score: number): string {
  if (score >= 80) return 'excellent';
  if (score >= 65) return 'strong';
  if (score >= 50) return 'moderate';
  if (score >= 35) return 'developing';
  return 'needs attention';
}

type PillarEntry = [string, number];

function sortedPillars(ctx: ScoreContext): PillarEntry[] {
  return ([
    ['Income Stability', ctx.incomeStability],
    ['Spending Discipline', ctx.spendingDiscipline],
    ['Debt Trajectory', ctx.debtTrajectory],
    ['Financial Resilience', ctx.financialResilience],
    ['Growth Momentum', ctx.growthMomentum],
  ] as PillarEntry[]).sort((a, b) => b[1] - a[1]);
}

// ---------------------------------------------------------------------------
// Rich template fallback — much more comprehensive than before
// ---------------------------------------------------------------------------

function generateTemplateResponse(userMessage: string, ctx: FullChatContext): string {
  const msg = userMessage.toLowerCase();
  const { scores, transactions: tx, redFlags, lending } = ctx;
  const pillars = sortedPillars(scores);
  const [bestName, bestScore] = pillars[0];
  const [worstName, worstScore] = pillars[pillars.length - 1];

  // --- Greetings ---
  if (/^(hi|hey|hello|sup|yo|what'?s? up)/i.test(msg)) {
    return `Hey ${ctx.userName.split(' ')[0]}! I'm your Vivid assistant with full access to your financial data. Your overall score is ${scores.overall.toFixed(0)}/100. You earn about $${tx.avgMonthlyIncome.toLocaleString()}/mo and spend $${tx.avgMonthlySpending.toLocaleString()}/mo. Want to know your red flags, how to improve a specific area, or dive into your spending?`;
  }

  // --- Overall / scores ---
  if (msg.includes('score') || msg.includes('overall') || msg.includes('how am i doing') || msg.includes('how do i look')) {
    return `Your overall Vivid Score is ${scores.overall.toFixed(0)}/100 (${tier(scores.overall)}). Here's the breakdown: Income Stability ${scores.incomeStability.toFixed(0)}, Spending Discipline ${scores.spendingDiscipline.toFixed(0)}, Debt Trajectory ${scores.debtTrajectory.toFixed(0)}, Financial Resilience ${scores.financialResilience.toFixed(0)}, Growth Momentum ${scores.growthMomentum.toFixed(0)}. Your strongest pillar is ${bestName} (${bestScore.toFixed(0)}) and your biggest opportunity is ${worstName} (${worstScore.toFixed(0)}). ${redFlags.redCount > 0 ? `You also have ${redFlags.redCount} critical red flag${redFlags.redCount > 1 ? 's' : ''} that could hurt loan approval — ask me about those.` : ''}`;
  }

  // --- Red flags ---
  if (msg.includes('red flag') || msg.includes('flag') || msg.includes('hurt') || msg.includes('loan approval') || msg.includes('what would hurt')) {
    if (redFlags.topFlags.length === 0) return `Great news — no significant red flags detected in your profile! Your financial behavior looks clean from a lender's perspective. Keep doing what you're doing.`;
    const flagList = redFlags.topFlags.slice(0, 5).map((f) => `${f.severity === 'red' ? '🔴' : '🟡'} ${f.title}`).join('\n');
    return `Here's what could hurt your loan approval:\n\n${flagList}\n\nYou have ${redFlags.redCount} critical and ${redFlags.yellowCount} warning flags. Check the Red Flags page for detailed fix timelines for each one. Want me to explain any of these?`;
  }

  // --- Spending / budget ---
  if (msg.includes('spend') || msg.includes('budget') || msg.includes('where does my money go') || msg.includes('expenses')) {
    const topCats = tx.topSpendingCategories.slice(0, 5);
    const catList = topCats.map((c) => `• ${c.category}: $${c.total.toLocaleString()}`).join('\n');
    return `You spend an average of $${tx.avgMonthlySpending.toLocaleString()}/month. Here's where it goes:\n\n${catList}\n\nYour Spending Discipline score is ${scores.spendingDiscipline.toFixed(0)}/100. ${scores.spendingDiscipline < 60 ? `Your discretionary spending is high — cutting non-essentials could free up significant cash.` : `You're managing the essentials-vs-discretionary balance well.`} Want details on any category?`;
  }

  // --- Subscriptions ---
  if (msg.includes('subscription') || msg.includes('recurring') || msg.includes('netflix') || msg.includes('spotify')) {
    if (tx.recurringCharges.length === 0) return `I don't see many recurring subscriptions in your data. That's actually a good sign — low fixed obligations give you more flexibility.`;
    const subList = tx.recurringCharges.slice(0, 8).map((r) => `• ${r.name}: $${Math.abs(r.amount).toFixed(0)}/mo`).join('\n');
    const total = tx.recurringCharges.reduce((s, r) => s + Math.abs(r.amount), 0);
    return `I found about ${tx.subscriptionCount} recurring charges totaling ~$${total.toFixed(0)}/month:\n\n${subList}\n\nThat's $${(total * 12).toFixed(0)}/year. Check the Optimize Spend page to see which ones I flagged as unnecessary. Even cutting 2-3 could free up $${(total * 0.3).toFixed(0)}/month.`;
  }

  // --- Income ---
  if (msg.includes('income') || msg.includes('salary') || msg.includes('earning') || msg.includes('paycheck') || msg.includes('how much do i make')) {
    const trend = tx.avgMonthlySavings > 0 ? 'earning more than you spend' : 'spending more than you earn';
    return `Your average monthly income is $${tx.avgMonthlyIncome.toLocaleString()} from ${tx.incomeSourceCount} source${tx.incomeSourceCount > 1 ? 's' : ''}. ${tx.hasPayrollDeposit ? 'I see regular payroll deposits, which is great for stability.' : 'Your income comes from non-payroll sources — consistent timing of deposits helps your stability score.'} Your Income Stability score is ${scores.incomeStability.toFixed(0)}/100 (${tier(scores.incomeStability)}). You're currently ${trend} — your net monthly savings average $${tx.avgMonthlySavings.toLocaleString()}.`;
  }

  // --- Debt ---
  if (msg.includes('debt') || msg.includes('owe') || msg.includes('loan') || msg.includes('credit card') || msg.includes('dti')) {
    return `Your debt payments average $${tx.debtPaymentInfo.avgMonthly.toLocaleString()}/month, giving you a debt-to-income ratio of ${(tx.debtPaymentInfo.dtiRatio * 100).toFixed(1)}%. ${tx.debtPaymentInfo.dtiRatio > 0.43 ? 'That\'s above the critical 43% threshold — most lenders will flag this.' : tx.debtPaymentInfo.dtiRatio > 0.35 ? 'That\'s getting elevated — ideal is below 35%.' : 'That\'s in a healthy range.'} Your Debt Trajectory score is ${scores.debtTrajectory.toFixed(0)}/100. ${scores.debtTrajectory < 60 ? 'Paying even a small amount above minimum on your highest-rate debt can shift this score significantly.' : 'You\'re managing debt well — keep up the consistent payments.'}`;
  }

  // --- Savings / emergency fund ---
  if (msg.includes('save') || msg.includes('saving') || msg.includes('emergency') || msg.includes('resilience') || msg.includes('rainy day') || msg.includes('runway')) {
    return `Your Financial Resilience score is ${scores.financialResilience.toFixed(0)}/100. Your emergency runway is about ${tx.emergencyRunway} month${tx.emergencyRunway !== 1 ? 's' : ''} of expenses. ${tx.emergencyRunway < 1 ? 'That\'s critically low — even $25/week into a separate account starts building your safety net.' : tx.emergencyRunway < 3 ? 'You have some buffer but the goal is 3-6 months. Consider automating transfers to build this up.' : 'Solid buffer! You\'re well-positioned to handle unexpected expenses.'} Your average monthly net savings is $${tx.avgMonthlySavings.toLocaleString()}.`;
  }

  // --- Investing / growth ---
  if (msg.includes('invest') || msg.includes('grow') || msg.includes('wealth') || msg.includes('stock') || msg.includes('momentum') || msg.includes('future')) {
    return `Your Growth Momentum score is ${scores.growthMomentum.toFixed(0)}/100. ${scores.growthMomentum >= 60 ? 'You\'re showing forward progress with positive savings trends.' : 'There\'s significant room to build momentum.'} Your average savings rate is ${tx.avgMonthlyIncome > 0 ? ((tx.avgMonthlySavings / tx.avgMonthlyIncome) * 100).toFixed(1) : '0'}% of income. ${tx.avgMonthlySavings > 0 ? `That's $${(tx.avgMonthlySavings * 12).toLocaleString()}/year going to savings — great foundation.` : 'Building even a small consistent savings habit is the single most impactful step you can take.'} Check the Time Machine to see how small changes compound over 12 months.`;
  }

  // --- Mortgage / house ---
  if (msg.includes('mortgage') || msg.includes('house') || msg.includes('home') || msg.includes('buy a house')) {
    return `Your mortgage readiness score is ${lending.mortgage}/100. ${lending.mortgage >= 70 ? 'You\'re in solid shape for a mortgage application!' : lending.mortgage >= 50 ? 'You\'re getting close — focus on improving your weakest pillar first.' : 'You\'ll want to strengthen your profile before applying.'} Key factors: DTI at ${(tx.debtPaymentInfo.dtiRatio * 100).toFixed(1)}% (lenders want <43%), emergency runway of ${tx.emergencyRunway} months, and overall score of ${scores.overall.toFixed(0)}. ${scores.debtTrajectory < 60 ? 'Reducing your DTI would have the biggest impact.' : scores.financialResilience < 60 ? 'Building your savings buffer would help most.' : 'Your fundamentals look good.'}`;
  }

  // --- Personal loan / auto ---
  if (msg.includes('personal loan') || msg.includes('auto loan') || msg.includes('car loan') || msg.includes('can i get a loan')) {
    return `Here's your lending readiness: Personal Loan ${lending.personalLoan}/100, Auto Loan ${lending.autoLoan}/100, Mortgage ${lending.mortgage}/100, Small Business ${lending.smallBiz}/100. ${scores.overall >= 65 ? 'You\'re in a good position for most loan products.' : 'There\'s work to do before applying.'} Your DTI is ${(tx.debtPaymentInfo.dtiRatio * 100).toFixed(1)}% and you have ${redFlags.redCount} critical red flags. ${redFlags.redCount > 0 ? 'Fixing those flags first would significantly improve your approval odds.' : 'No critical flags — that\'s a strong starting point.'}`;
  }

  // --- Improve / tips / advice ---
  if (msg.includes('improve') || msg.includes('better') || msg.includes('advice') || msg.includes('tip') || msg.includes('help me') || msg.includes('what should i do') || msg.includes('fix')) {
    const actions: string[] = [];
    if (redFlags.topFlags.length > 0) {
      const topFlag = redFlags.topFlags[0];
      actions.push(`1. Fix your top red flag: "${topFlag.title}" — this is what hurts you most with lenders.`);
    }
    if (scores.financialResilience < 60) {
      actions.push(`${actions.length + 1}. Build your emergency fund to at least 2 months (currently ${tx.emergencyRunway} month${tx.emergencyRunway !== 1 ? 's' : ''}).`);
    }
    if (tx.avgMonthlySavings <= 0) {
      actions.push(`${actions.length + 1}. Start saving — even $25/week ($100/mo) puts you in a completely different position in 6 months.`);
    }
    if (tx.subscriptionCount > 6) {
      actions.push(`${actions.length + 1}. Audit your ${tx.subscriptionCount} subscriptions — most people can cut 30% without noticing.`);
    }
    if (scores.debtTrajectory < 60) {
      actions.push(`${actions.length + 1}. Pay more than the minimum on your highest-interest debt — it shifts your trajectory fast.`);
    }
    if (actions.length === 0) {
      actions.push('1. You\'re in great shape! Focus on maintaining your habits and building wealth through the Time Machine scenarios.');
    }
    return `Here's your personalized priority list:\n\n${actions.join('\n')}\n\nFocusing on #1 first will have the biggest impact. Want me to go deeper on any of these?`;
  }

  // --- Large purchases / recent ---
  if (msg.includes('large') || msg.includes('biggest') || msg.includes('expensive') || msg.includes('recent purchase')) {
    if (tx.recentLargeExpenses.length === 0) return `I don't see any unusually large expenses in your recent transactions. Your spending has been fairly consistent.`;
    const list = tx.recentLargeExpenses.slice(0, 5).map((e) => `• ${e.name}: $${Math.abs(e.amount).toFixed(0)} (${e.date})`).join('\n');
    return `Here are your largest recent expenses:\n\n${list}\n\nThese one-time hits can affect your balance and resilience score. If any were unexpected, it's a good argument for building a larger emergency buffer.`;
  }

  // --- How much can I save ---
  if (msg.includes('how much can i save') || msg.includes('save more') || msg.includes('cut back')) {
    const subSavings = tx.recurringCharges.reduce((s, r) => s + Math.abs(r.amount), 0) * 0.3;
    const discSavings = tx.topSpendingCategories
      .filter((c) => !['rent', 'groceries', 'utilities', 'insurance', 'medical', 'transportation', 'debt_payment'].includes(c.category))
      .reduce((s, c) => s + c.total, 0) * 0.2 / Math.max(tx.monthsAnalyzed, 1);
    const totalPotential = Math.round(subSavings + discSavings);
    return `Based on your actual spending, here's what's realistic:\n\n• Cut 30% of subscriptions: ~$${subSavings.toFixed(0)}/mo\n• Reduce discretionary by 20%: ~$${discSavings.toFixed(0)}/mo\n• Total potential: ~$${totalPotential}/mo ($${(totalPotential * 12).toLocaleString()}/year)\n\nThat could take your emergency runway from ${tx.emergencyRunway} months to ${tx.emergencyRunway + Math.floor(totalPotential * 6 / Math.max(tx.avgMonthlySpending, 1))} months in just 6 months. Check the Time Machine to simulate this.`;
  }

  // --- Catch-all: still useful ---
  return `${ctx.userName.split(' ')[0]}, your Vivid Score is ${scores.overall.toFixed(0)}/100. You earn ~$${tx.avgMonthlyIncome.toLocaleString()}/mo, spend ~$${tx.avgMonthlySpending.toLocaleString()}/mo, and have ${tx.emergencyRunway} month${tx.emergencyRunway !== 1 ? 's' : ''} of emergency runway. ${redFlags.redCount > 0 ? `You have ${redFlags.redCount} red flag${redFlags.redCount > 1 ? 's' : ''} to address.` : 'No critical red flags.'} Ask me about your spending, debt, savings, subscriptions, loan readiness, red flags, or how to improve — I have access to all your data and can give specific advice!`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function generateChatResponse(
  userMessage: string,
  history: ChatMessage[],
  context: FullChatContext,
): Promise<string> {
  const contextBlock = buildContextBlock(context);
  const fullSystem = `${SYSTEM_PROMPT}\n\n${contextBlock}`;

  const messages = [
    ...history.slice(-10),
    { role: 'user' as const, content: userMessage },
  ];

  const aiResponse = await callVertexChat(fullSystem, messages);
  if (aiResponse) return aiResponse;

  return generateTemplateResponse(userMessage, context);
}

// Backward-compatible wrapper for the old simple interface
export async function generateChatResponseSimple(
  userMessage: string,
  history: ChatMessage[],
  scoreContext: ScoreContext,
): Promise<string> {
  const context: FullChatContext = {
    scores: scoreContext,
    transactions: {
      totalTransactions: 0,
      monthsAnalyzed: 0,
      avgMonthlyIncome: 0,
      avgMonthlySpending: 0,
      avgMonthlySavings: 0,
      topSpendingCategories: [],
      recurringCharges: [],
      recentLargeExpenses: [],
      debtPaymentInfo: { avgMonthly: 0, dtiRatio: 0 },
      emergencyRunway: 0,
      subscriptionCount: 0,
      hasPayrollDeposit: false,
      incomeSourceCount: 1,
      overdraftCount: 0,
    },
    redFlags: { redCount: 0, yellowCount: 0, topFlags: [] },
    lending: { personalLoan: 0, autoLoan: 0, mortgage: 0, smallBiz: 0 },
    userName: 'there',
  };

  return generateChatResponse(userMessage, history, context);
}
