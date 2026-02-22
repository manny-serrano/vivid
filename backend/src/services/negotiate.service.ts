import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export interface NegotiableBill {
  id: string;
  merchantName: string;
  currentMonthly: number;
  estimatedFair: number;
  potentialSavings: number;
  annualSavings: number;
  category: string;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  negotiationType: 'price_reduction' | 'cancellation' | 'downgrade' | 'competitor_match';
}

export interface GeneratedEmail {
  subject: string;
  body: string;
  recipientHint: string;
  tone: string;
  negotiationType: string;
}

export interface RefineRequest {
  currentEmail: string;
  instruction: string;
  merchantName: string;
  context: { currentMonthly: number; estimatedFair: number; userName: string };
}

const AVERAGE_PRICES: Record<string, { avg: number; low: number }> = {
  'internet': { avg: 65, low: 40 },
  'cable': { avg: 85, low: 50 },
  'phone': { avg: 75, low: 35 },
  'car insurance': { avg: 150, low: 90 },
  'home insurance': { avg: 120, low: 80 },
  'renters insurance': { avg: 20, low: 12 },
  'gym': { avg: 35, low: 10 },
  'streaming': { avg: 15, low: 7 },
  'cloud storage': { avg: 10, low: 3 },
  'security system': { avg: 40, low: 20 },
  'lawn care': { avg: 50, low: 30 },
  'pest control': { avg: 45, low: 25 },
  'storage unit': { avg: 90, low: 50 },
};

const BILL_CATEGORIES = new Set([
  'utilities', 'insurance', 'subscriptions', 'internet', 'phone',
  'cable', 'gym', 'rent', 'entertainment',
]);

const NEGOTIABLE_KEYWORDS: Record<string, string> = {
  'comcast': 'internet', 'xfinity': 'internet', 'spectrum': 'internet', 'att': 'internet',
  'at&t': 'internet', 'verizon': 'phone', 't-mobile': 'phone', 'tmobile': 'phone',
  'cox': 'internet', 'frontier': 'internet', 'centurylink': 'internet', 'optimum': 'internet',
  'state farm': 'car insurance', 'geico': 'car insurance', 'progressive': 'car insurance',
  'allstate': 'car insurance', 'usaa': 'car insurance', 'nationwide': 'car insurance',
  'liberty mutual': 'car insurance', 'farmers': 'car insurance',
  'planet fitness': 'gym', 'la fitness': 'gym', 'anytime fitness': 'gym',
  'equinox': 'gym', 'gold gym': 'gym', 'ymca': 'gym', '24 hour fitness': 'gym',
  'adt': 'security system', 'vivint': 'security system', 'simplisafe': 'security system',
};

export async function detectNegotiableBills(userId: string): Promise<NegotiableBill[]> {
  const twin = await prisma.twin.findUnique({
    where: { userId },
    include: { transactions: true },
  });
  if (!twin) throw new Error('Twin not found');

  const recurring = twin.transactions.filter((t) => t.isRecurring && !t.isIncomeDeposit);

  const byMerchant = new Map<string, typeof recurring>();
  for (const t of recurring) {
    const key = (t.merchantName ?? 'unknown').toLowerCase();
    const bucket = byMerchant.get(key) ?? [];
    bucket.push(t);
    byMerchant.set(key, bucket);
  }

  const bills: NegotiableBill[] = [];
  let counter = 0;

  for (const [key, txs] of byMerchant) {
    if (txs.length < 2) continue;
    const amounts = txs.map((t) => Math.abs(t.amount));
    const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    if (avg < 10) continue;

    let billType: string | null = null;
    for (const [kw, type] of Object.entries(NEGOTIABLE_KEYWORDS)) {
      if (key.includes(kw)) { billType = type; break; }
    }
    if (!billType && BILL_CATEGORIES.has(txs[0].vividCategory)) {
      billType = txs[0].vividCategory;
    }
    if (!billType) continue;

    const priceRef = AVERAGE_PRICES[billType];
    const estimatedFair = priceRef ? priceRef.avg : avg * 0.75;
    const savings = avg - estimatedFair;
    if (savings < 5) continue;

    const latestAmount = amounts[amounts.length - 1];
    const priceIncreased = amounts.length >= 3 && latestAmount > amounts[0] * 1.1;

    let confidence: 'high' | 'medium' | 'low' = 'medium';
    let reason = '';
    let negotiationType: NegotiableBill['negotiationType'] = 'price_reduction';

    if (priceRef && avg > priceRef.avg * 1.3) {
      confidence = 'high';
      reason = `You're paying $${avg.toFixed(0)}/mo — users in your area pay ~$${priceRef.avg}/mo on average. That's ${Math.round(((avg / priceRef.avg) - 1) * 100)}% above average.`;
      negotiationType = 'competitor_match';
    } else if (priceIncreased) {
      confidence = 'high';
      reason = `Your bill has increased ${Math.round(((latestAmount / amounts[0]) - 1) * 100)}% since you started. Ask them to revert to your original rate.`;
      negotiationType = 'price_reduction';
    } else if (priceRef && avg > priceRef.avg) {
      confidence = 'medium';
      reason = `You're paying above the national average of $${priceRef.avg}/mo. A quick call or email could save you $${Math.round(savings)}/mo.`;
      negotiationType = 'price_reduction';
    } else {
      confidence = 'low';
      reason = `Consider downgrading your plan or switching to a competitor for better rates.`;
      negotiationType = 'downgrade';
    }

    bills.push({
      id: `bill_${++counter}`,
      merchantName: txs[0].merchantName ?? key,
      currentMonthly: Math.round(avg * 100) / 100,
      estimatedFair: Math.round(estimatedFair * 100) / 100,
      potentialSavings: Math.round(savings * 100) / 100,
      annualSavings: Math.round(savings * 12 * 100) / 100,
      category: billType,
      confidence,
      reason,
      negotiationType,
    });
  }

  bills.sort((a, b) => b.annualSavings - a.annualSavings);
  return bills;
}

export async function generateNegotiationEmail(
  bill: { merchantName: string; currentMonthly: number; estimatedFair: number; negotiationType: string },
  userName: string,
  tone: string = 'professional',
): Promise<GeneratedEmail> {
  const aiEmail = await callVertexForEmail(bill, userName, tone);
  if (aiEmail) return aiEmail;
  return buildTemplateEmail(bill, userName, tone);
}

export async function refineEmail(req: RefineRequest): Promise<GeneratedEmail> {
  const refined = await callVertexForRefinement(req);
  if (refined) return refined;
  return { subject: '', body: req.currentEmail, recipientHint: '', tone: '', negotiationType: '' };
}

async function callVertexForEmail(
  bill: { merchantName: string; currentMonthly: number; estimatedFair: number; negotiationType: string },
  userName: string,
  tone: string,
): Promise<GeneratedEmail | null> {
  try {
    const { VertexAI } = await import('@google-cloud/vertexai');
    const vertexAI = new VertexAI({ project: env.GCP_PROJECT_ID, location: env.VERTEX_AI_LOCATION });
    const model = vertexAI.getGenerativeModel({
      model: env.VERTEX_AI_MODEL,
      generationConfig: { temperature: 0.7, topP: 0.9, maxOutputTokens: 1024 },
    });

    const prompt = `You are an expert bill negotiation agent. Write a ${tone} email from "${userName}" to ${bill.merchantName} requesting a ${bill.negotiationType.replace(/_/g, ' ')}.

CONTEXT:
- Current monthly bill: $${bill.currentMonthly.toFixed(2)}
- Fair market rate: $${bill.estimatedFair.toFixed(2)}
- Customer is willing to switch to a competitor if needed
- Tone: ${tone}

RULES:
- Return ONLY a JSON object with these fields: subject, body, recipientHint
- subject: email subject line
- body: the full email body (use \\n for newlines)
- recipientHint: suggested email address pattern (e.g. "support@company.com")
- Be persuasive but respectful
- Reference competitor pricing when relevant
- If tone is "firm", be more direct about switching
- If tone is "friendly", be warm but still push for discount
- Include specific dollar amounts and percentage savings
- End with a clear call to action`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        subject: parsed.subject ?? `Rate Reduction Request — ${bill.merchantName}`,
        body: (parsed.body ?? '').replace(/\\n/g, '\n'),
        recipientHint: parsed.recipientHint ?? `support@${bill.merchantName.toLowerCase().replace(/\s+/g, '')}.com`,
        tone,
        negotiationType: bill.negotiationType,
      };
    }
    return null;
  } catch (err) {
    logger.warn('[negotiate] Vertex AI unavailable, using template', { error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

async function callVertexForRefinement(req: RefineRequest): Promise<GeneratedEmail | null> {
  try {
    const { VertexAI } = await import('@google-cloud/vertexai');
    const vertexAI = new VertexAI({ project: env.GCP_PROJECT_ID, location: env.VERTEX_AI_LOCATION });
    const model = vertexAI.getGenerativeModel({
      model: env.VERTEX_AI_MODEL,
      generationConfig: { temperature: 0.7, topP: 0.9, maxOutputTokens: 1024 },
    });

    const prompt = `You are an expert email editor. The user wants you to refine their bill negotiation email.

CURRENT EMAIL:
${req.currentEmail}

USER INSTRUCTION: "${req.instruction}"

CONTEXT:
- Merchant: ${req.merchantName}
- Current bill: $${req.context.currentMonthly}/mo
- Fair rate: $${req.context.estimatedFair}/mo
- Customer name: ${req.context.userName}

Apply the user's instruction to the email. Return ONLY a JSON object: { "subject": "...", "body": "..." }
- Keep the overall structure but apply the requested change
- If they say "more professional", elevate the language
- If they say "more firm", be more direct about switching providers
- If they add specific content, weave it in naturally
- Use \\n for newlines in body`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        subject: parsed.subject ?? '',
        body: (parsed.body ?? '').replace(/\\n/g, '\n'),
        recipientHint: `support@${req.merchantName.toLowerCase().replace(/\s+/g, '')}.com`,
        tone: 'refined',
        negotiationType: 'price_reduction',
      };
    }
    return null;
  } catch (err) {
    logger.warn('[negotiate] Vertex AI refinement unavailable', { error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

function buildTemplateEmail(
  bill: { merchantName: string; currentMonthly: number; estimatedFair: number; negotiationType: string },
  userName: string,
  tone: string,
): GeneratedEmail {
  const savings = bill.currentMonthly - bill.estimatedFair;
  const pct = Math.round((savings / bill.currentMonthly) * 100);

  const tonePrefix = tone === 'firm'
    ? `I am writing to inform you that I have been reviewing my monthly expenses and have found that my current rate is significantly above market rates. I am prepared to switch providers unless we can resolve this.`
    : tone === 'friendly'
    ? `I hope this email finds you well! I've been a loyal customer and really enjoy your service. I was recently comparing rates in my area and noticed I might be paying a bit more than I need to.`
    : `I am writing to discuss my current monthly rate and explore options for a more competitive price.`;

  const body = `Dear ${bill.merchantName} Customer Service,

${tonePrefix}

I am currently paying $${bill.currentMonthly.toFixed(2)} per month for my service. Based on my research, the average rate in my area is approximately $${bill.estimatedFair.toFixed(2)} per month — meaning I am paying roughly ${pct}% above market rate.

I have been a consistent, on-time customer and I would like to continue using your service. However, at my current rate, I am spending $${(savings * 12).toFixed(2)} more per year than necessary.

I would appreciate it if you could:
1. Match the competitive rate of $${bill.estimatedFair.toFixed(2)}/month
2. Or offer a loyalty discount to bring my bill closer to market rate
3. Or suggest a plan adjustment that better fits my budget

I am open to a brief call to discuss this further. If we cannot reach an agreement, I may need to explore alternatives.

Thank you for your time and consideration.

Best regards,
${userName}`;

  return {
    subject: `Rate Adjustment Request — Account Holder: ${userName}`,
    body,
    recipientHint: `support@${bill.merchantName.toLowerCase().replace(/\s+/g, '')}.com`,
    tone,
    negotiationType: bill.negotiationType,
  };
}
