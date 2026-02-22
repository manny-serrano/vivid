import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Card } from '../ui/Card';

interface Transaction {
  amount: number;
  merchantName?: string | null;
  vividCategory: string;
  isIncomeDeposit: boolean;
}

interface SpendingBreakdownProps {
  transactions: Transaction[];
}

const EXCLUDED_CATEGORIES = new Set([
  'income',
  'savings_transfer',
  'investment',
]);

const CATEGORY_COLORS: Record<string, string> = {
  rent: '#6366F1',
  groceries: '#10B981',
  utilities: '#F59E0B',
  insurance: '#8B5CF6',
  medical: '#EC4899',
  dining: '#F43F5E',
  entertainment: '#A855F7',
  shopping: '#3B82F6',
  subscriptions: '#14B8A6',
  transportation: '#06B6D4',
  debt_payment: '#EF4444',
  other: '#64748B',
};

const CATEGORY_LABELS: Record<string, string> = {
  rent: 'Rent / Housing',
  groceries: 'Groceries',
  utilities: 'Utilities',
  insurance: 'Insurance',
  medical: 'Medical',
  dining: 'Dining Out',
  entertainment: 'Entertainment',
  shopping: 'Shopping',
  subscriptions: 'Subscriptions',
  transportation: 'Transportation',
  debt_payment: 'Debt Payments',
  other: 'Other',
};

/**
 * Client-side fallback for transactions the backend tagged as "other".
 * Matches against merchantName to rescue mis-categorized transactions
 * without requiring a twin re-generation.
 */
const MERCHANT_RECATEGORIZE: [RegExp, string][] = [
  // Dining
  [/starbucks|mcdonald|mcd's|chipotle|chick-fil-a|dunkin|subway|wendy|burger king|taco bell|panda express|panera|kfc|popeyes|five guys|shake shack|domino|pizza hut|papa john|wingstop|sonic|ihop|denny|waffle house|cracker barrel|applebee|olive garden|chili'?s|outback|red lobster|buffalo wild|jack in the box|in-n-out|whataburger|jersey mike|jimmy john|firehouse sub|noodles|el pollo|del taco|zaxby|culver|raising cane|uber\s?eat|doordash|grubhub|postmates|seamless|caviar/i, 'dining'],
  // Groceries
  [/walmart|target|costco|whole foods|trader joe|kroger|aldi|publix|safeway|sam'?s club|food lion|giant|wegman|h-?e-?b|meijer|sprouts|market basket|piggly|winn-?dixie|harris teeter|stop.?shop|shoprite|vons|ralphs|albertson|hannaford|lidl|fresh market|instacart/i, 'groceries'],
  // Transportation
  [/uber(?!\s?eat)|lyft|shell|chevron|exxon|bp |sunoco|marathon|valero|citgo|wawa|speedway|circle k|quiktrip|racetrac|pilot|loves|sheetz|casey|amtrak|mta|metro|transit|parking|united air|delta air|american air|southwest|jetblue|spirit air|frontier air/i, 'transportation'],
  // Subscriptions
  [/netflix|spotify|hulu|disney\+|apple music|amazon prime|youtube|hbo|paramount|peacock|adobe|microsoft 365|dropbox|icloud|google storage|openai|chatgpt|slack|zoom|notion|figma|canva|gym|planet fitness|anytime fitness|la fitness|equinox|crunch|24 hour/i, 'subscriptions'],
  // Entertainment
  [/amc |regal|cinemark|fandango|ticketmaster|stubhub|seatgeek|eventbrite|steam|playstation|xbox|nintendo|twitch|patreon|topgolf|dave.?buster|bowlero|touchstone|sparkfun/i, 'entertainment'],
  // Shopping
  [/amazon(?! prime)|ebay|etsy|best buy|home depot|lowe'?s|ikea|wayfair|nordstrom|macy|kohls|tjmaxx|tj maxx|marshalls|ross |old navy|gap |h&m|zara|nike|adidas|foot locker|sephora|ulta|bath.?body|victoria|apple store|madison bicycle/i, 'shopping'],
  // Utilities
  [/at&t|verizon|t-?mobile|sprint|comcast|xfinity|spectrum|cox |frontier comm|centurylink|duke energy|pge|con ?ed|national grid|water|sewer|electric|gas bill|power bill/i, 'utilities'],
  // Insurance
  [/geico|progressive|state farm|allstate|liberty mutual|farmers|usaa|nationwide|travelers|metlife|aflac|cigna|aetna|united ?health|anthem|humana|kaiser/i, 'insurance'],
  // Medical
  [/cvs|walgreen|rite aid|urgent care|hospital|clinic|pharmacy|dr\.|dentist|optom|dermat|lab ?corp|quest diag/i, 'medical'],
  // Rent
  [/rent|landlord|property mgmt|property management|apartment|zillow|zelle.*rent|venmo.*rent/i, 'rent'],
  // Debt payments
  [/loan pay|student loan|sallie mae|navient|sofi|credit card pay|discover pay|chase pay|capital one pay|amex pay|mortgage pay|auto pay.*loan/i, 'debt_payment'],
];

function recategorize(vividCategory: string, merchantName?: string | null): string {
  if (vividCategory !== 'other' || !merchantName) return vividCategory;
  for (const [pattern, category] of MERCHANT_RECATEGORIZE) {
    if (pattern.test(merchantName)) return category;
  }
  return 'other';
}

export function SpendingBreakdown({ transactions }: SpendingBreakdownProps) {
  const { chartData, totalSpending, topAmount } = useMemo(() => {
    const byCategory: Record<string, number> = {};

    for (const t of transactions) {
      if (t.isIncomeDeposit || t.amount <= 0) continue;
      let cat = t.vividCategory || 'other';
      if (EXCLUDED_CATEGORIES.has(cat)) continue;
      cat = recategorize(cat, t.merchantName);
      if (EXCLUDED_CATEGORIES.has(cat)) continue;
      byCategory[cat] = (byCategory[cat] ?? 0) + t.amount;
    }

    const sorted = Object.entries(byCategory)
      .map(([category, value]) => ({
        category,
        label: CATEGORY_LABELS[category] ?? category.charAt(0).toUpperCase() + category.slice(1),
        value: Math.round(value),
        color: CATEGORY_COLORS[category] ?? '#64748B',
      }))
      .sort((a, b) => b.value - a.value);

    const total = sorted.reduce((sum, d) => sum + d.value, 0);
    const top = sorted.length > 0 ? sorted[0].value : 1;
    return { chartData: sorted, totalSpending: total, topAmount: top };
  }, [transactions]);

  if (chartData.length === 0) {
    return (
      <Card>
        <h3 className="text-lg font-semibold mb-2">Spending breakdown</h3>
        <p className="text-text-secondary text-sm">No spending data to display.</p>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.35 }}
    >
      <Card className="h-full flex flex-col">
        <h3 className="text-lg font-semibold mb-4">Spending breakdown</h3>

        {/* Donut chart */}
        <div className="h-44 w-full relative mb-2">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={72}
                paddingAngle={2}
                animationDuration={800}
              >
                {chartData.map((d) => (
                  <Cell key={d.category} fill={d.color} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1E293B',
                  border: '1px solid #334155',
                  borderRadius: 12,
                  fontSize: 13,
                }}
                labelStyle={{ color: '#F8FAFC' }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, undefined]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[11px] text-text-secondary uppercase tracking-wide">Total</span>
            <span className="text-xl font-bold">${totalSpending.toLocaleString()}</span>
          </div>
        </div>

        {/* Category bars */}
        <div className="space-y-3 mt-auto">
          {chartData.map((d) => {
            const pct = totalSpending > 0 ? (d.value / totalSpending) * 100 : 0;
            const barWidth = topAmount > 0 ? (d.value / topAmount) * 100 : 0;
            return (
              <div key={d.category}>
                <div className="flex items-center justify-between mb-1">
                  <span className="flex items-center gap-2 text-sm">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: d.color }}
                    />
                    <span className="text-text-secondary">{d.label}</span>
                  </span>
                  <span className="text-sm font-medium tabular-nums">
                    ${d.value.toLocaleString()}
                    <span className="text-text-secondary ml-1.5 text-xs">
                      {pct.toFixed(0)}%
                    </span>
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-700/50 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: d.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${barWidth}%` }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </motion.div>
  );
}
