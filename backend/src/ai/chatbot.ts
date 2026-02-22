// ---------------------------------------------------------------------------
// Vivid – Financial Chatbot powered by Vivid Score context
// ---------------------------------------------------------------------------

import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

interface ScoreContext {
  overall: number;
  incomeStability: number;
  spendingDiscipline: number;
  debtTrajectory: number;
  financialResilience: number;
  growthMomentum: number;
  consumerNarrative: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = `You are Vivid, a friendly and knowledgeable financial wellness chatbot. You have two personalities the user can pick from — "Nova" (female voice, warm and encouraging) and "Atlas" (male voice, calm and analytical) — but your written answers should work for either.

You have access to this user's Vivid Financial Twin data. Use it to give specific, personalised advice. Rules:
- Be conversational, warm, and concise (2-4 sentences per response unless they ask for detail).
- Reference their actual scores and strengths/weaknesses when relevant.
- Never shame or lecture. Frame weaknesses as opportunities.
- If they ask something unrelated to finance, gently steer back.
- Use plain language. If you must use a financial term, briefly define it.
- Don't output raw JSON or code.`;

async function callVertexChat(
  systemPrompt: string,
  messages: { role: string; content: string }[],
): Promise<string | null> {
  try {
    const { VertexAI } = await import('@google-cloud/vertexai');
    const vertexAI = new VertexAI({ project: env.GCP_PROJECT_ID, location: env.VERTEX_AI_LOCATION });
    const model = vertexAI.getGenerativeModel({
      model: env.VERTEX_AI_MODEL,
      generationConfig: { temperature: 0.8, topP: 0.9, maxOutputTokens: 512 },
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

function tier(score: number): string {
  if (score >= 80) return 'excellent';
  if (score >= 65) return 'strong';
  if (score >= 50) return 'moderate';
  if (score >= 35) return 'developing';
  return 'needs attention';
}

function bestPillar(ctx: ScoreContext): [string, number] {
  const pillars: [string, number][] = [
    ['Income Stability', ctx.incomeStability],
    ['Spending Discipline', ctx.spendingDiscipline],
    ['Debt Trajectory', ctx.debtTrajectory],
    ['Financial Resilience', ctx.financialResilience],
    ['Growth Momentum', ctx.growthMomentum],
  ];
  return pillars.sort((a, b) => b[1] - a[1])[0];
}

function weakestPillar(ctx: ScoreContext): [string, number] {
  const pillars: [string, number][] = [
    ['Income Stability', ctx.incomeStability],
    ['Spending Discipline', ctx.spendingDiscipline],
    ['Debt Trajectory', ctx.debtTrajectory],
    ['Financial Resilience', ctx.financialResilience],
    ['Growth Momentum', ctx.growthMomentum],
  ];
  return pillars.sort((a, b) => a[1] - b[1])[0];
}

function generateTemplateResponse(userMessage: string, ctx: ScoreContext): string {
  const msg = userMessage.toLowerCase();
  const [bestName, bestScore] = bestPillar(ctx);
  const [worstName, worstScore] = weakestPillar(ctx);

  if (msg.includes('score') || msg.includes('overall') || msg.includes('how am i doing')) {
    return `Your overall Vivid Score is ${ctx.overall.toFixed(0)}/100 — that's in the ${tier(ctx.overall)} range! Your strongest area is ${bestName} at ${bestScore.toFixed(0)}, and the area with the most room to grow is ${worstName} at ${worstScore.toFixed(0)}. Want me to dig into any specific dimension?`;
  }

  if (msg.includes('income') || msg.includes('salary') || msg.includes('earning')) {
    const s = ctx.incomeStability;
    if (s >= 70) return `Your Income Stability score is ${s.toFixed(0)}/100 — that's ${tier(s)}! You have consistent, reliable income patterns. This is a real asset when it comes to loan applications and long-term planning.`;
    if (s >= 50) return `Your Income Stability is at ${s.toFixed(0)}/100. You have a decent income base, but there's some variability. Consider diversifying income sources or building a buffer for months when income dips.`;
    return `Your Income Stability is ${s.toFixed(0)}/100, which means there's some inconsistency in your income. This is common for gig workers or freelancers. Building a 2-3 month buffer can really help smooth things out.`;
  }

  if (msg.includes('spend') || msg.includes('budget') || msg.includes('shopping')) {
    const s = ctx.spendingDiscipline;
    if (s >= 70) return `Your Spending Discipline score is ${s.toFixed(0)}/100 — impressive! You're keeping a healthy balance between essential and discretionary spending. Keep it up!`;
    if (s >= 50) return `Your Spending Discipline is at ${s.toFixed(0)}/100. There's room to tighten things up — reviewing subscriptions and tracking discretionary spending are good first steps.`;
    return `Your Spending Discipline is at ${s.toFixed(0)}/100. It looks like discretionary spending might be outpacing essentials. Try the 50/30/20 rule: 50% needs, 30% wants, 20% savings.`;
  }

  if (msg.includes('debt') || msg.includes('loan') || msg.includes('owe')) {
    const s = ctx.debtTrajectory;
    if (s >= 70) return `Your Debt Trajectory is ${s.toFixed(0)}/100 — you're managing debt well! Your debt-to-income ratio is healthy and you're on a good repayment path.`;
    if (s >= 50) return `Your Debt Trajectory is ${s.toFixed(0)}/100. You're handling debt okay, but there's opportunity to improve. Consider focusing extra payments on your highest-interest balances.`;
    return `Your Debt Trajectory is ${s.toFixed(0)}/100 — this is an area to focus on. Reducing your debt-to-income ratio will open up better loan terms and improve your overall financial health.`;
  }

  if (msg.includes('save') || msg.includes('saving') || msg.includes('emergency') || msg.includes('resilien')) {
    const s = ctx.financialResilience;
    if (s >= 70) return `Your Financial Resilience score is ${s.toFixed(0)}/100 — great job building that safety net! You have solid reserves that can carry you through unexpected expenses.`;
    if (s >= 50) return `Your Financial Resilience is at ${s.toFixed(0)}/100. You've started building a buffer, but aim for at least 2-3 months of expenses saved. Even small automatic transfers add up fast.`;
    return `Your Financial Resilience is at ${s.toFixed(0)}/100 — this means unexpected expenses could hit hard. Start with a goal of saving $500 as a mini emergency fund, then build from there.`;
  }

  if (msg.includes('grow') || msg.includes('invest') || msg.includes('future') || msg.includes('momentum')) {
    const s = ctx.growthMomentum;
    if (s >= 70) return `Your Growth Momentum is ${s.toFixed(0)}/100 — you're actively building wealth! Your savings rate and investment activity show strong forward progress.`;
    if (s >= 50) return `Your Growth Momentum is at ${s.toFixed(0)}/100. You're making progress, but there's room to accelerate. Even automating $50/month into savings or investments compounds over time.`;
    return `Your Growth Momentum is at ${s.toFixed(0)}/100 — this is your biggest opportunity. Starting a small, consistent savings habit is the single most impactful step you can take right now.`;
  }

  if (msg.includes('improve') || msg.includes('better') || msg.includes('advice') || msg.includes('tip') || msg.includes('help')) {
    return `Based on your scores, I'd focus on ${worstName} (${worstScore.toFixed(0)}/100) first — that's where you'll see the biggest impact. ${
      worstName === 'Income Stability' ? 'Consider diversifying income sources or building a cash buffer.' :
      worstName === 'Spending Discipline' ? 'Try tracking discretionary spending for a month and cutting 1-2 subscriptions.' :
      worstName === 'Debt Trajectory' ? 'Focus extra payments on your highest-interest debt first.' :
      worstName === 'Financial Resilience' ? 'Start a small automatic savings transfer — even $25/week builds resilience.' :
      'Automate a savings transfer and explore low-cost index funds to build momentum.'
    } Want more specific advice on any area?`;
  }

  if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey') || msg.includes('sup')) {
    return `Hey there! I'm your Vivid financial assistant. Your overall score is ${ctx.overall.toFixed(0)}/100. Ask me anything about your finances — your scores, tips for improvement, or how you compare across the five dimensions!`;
  }

  if (msg.includes('mortgage') || msg.includes('house') || msg.includes('home')) {
    const ready = ctx.overall >= 65;
    return ready
      ? `With an overall Vivid Score of ${ctx.overall.toFixed(0)}, you're in a solid position for mortgage readiness. Lenders will look at all five pillars, and your strongest area (${bestName}) helps a lot here.`
      : `Your Vivid Score of ${ctx.overall.toFixed(0)} suggests you'd benefit from strengthening your profile before a mortgage application. Focus on ${worstName} first — that'll have the biggest impact on how lenders see you.`;
  }

  return `Great question! Your Vivid Score is ${ctx.overall.toFixed(0)}/100, with ${bestName} (${bestScore.toFixed(0)}) as your strongest dimension and ${worstName} (${worstScore.toFixed(0)}) as your biggest opportunity. Feel free to ask me about any specific area — income, spending, debt, savings, or growth — and I'll give you personalized advice!`;
}

export async function generateChatResponse(
  userMessage: string,
  history: ChatMessage[],
  scoreContext: ScoreContext,
): Promise<string> {
  const contextBlock = `USER'S VIVID FINANCIAL TWIN DATA:
- Overall Score: ${scoreContext.overall.toFixed(1)}/100
- Income Stability: ${scoreContext.incomeStability.toFixed(1)}/100
- Spending Discipline: ${scoreContext.spendingDiscipline.toFixed(1)}/100
- Debt Trajectory: ${scoreContext.debtTrajectory.toFixed(1)}/100
- Financial Resilience: ${scoreContext.financialResilience.toFixed(1)}/100
- Growth Momentum: ${scoreContext.growthMomentum.toFixed(1)}/100

NARRATIVE SUMMARY:
${scoreContext.consumerNarrative.slice(0, 500)}`;

  const fullSystem = `${SYSTEM_PROMPT}\n\n${contextBlock}`;

  const messages = [
    ...history.slice(-8),
    { role: 'user' as const, content: userMessage },
  ];

  const aiResponse = await callVertexChat(fullSystem, messages);
  if (aiResponse) return aiResponse;

  return generateTemplateResponse(userMessage, scoreContext);
}
