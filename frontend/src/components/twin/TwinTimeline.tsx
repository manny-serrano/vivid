import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card } from '../ui/Card';
import { formatDateShort } from '../../utils/formatDate';

interface Transaction {
  date: string;
  amount: number;
  merchantName?: string | null;
  vividCategory?: string;
  isIncomeDeposit?: boolean;
}

interface TwinTimelineProps {
  transactions?: Transaction[];
}

export function TwinTimeline({ transactions = [] }: TwinTimelineProps) {
  const byMonth: Record<string, { income: number; spending: number }> = {};

  for (const t of transactions) {
    const key = t.date.slice(0, 7);
    if (!byMonth[key]) byMonth[key] = { income: 0, spending: 0 };
    if (t.isIncomeDeposit || t.amount < 0) {
      byMonth[key].income += Math.abs(t.amount);
    } else {
      byMonth[key].spending += Math.abs(t.amount);
    }
  }

  const months = Object.keys(byMonth).sort();
  const data = months.map((m) => ({
    month: formatDateShort(`${m}-01`),
    Income: Math.round(byMonth[m].income),
    Spending: Math.round(byMonth[m].spending),
    net: Math.round(byMonth[m].income - byMonth[m].spending),
  }));

  if (data.length === 0) {
    return (
      <Card>
        <h3 className="text-lg font-semibold mb-2">Activity timeline</h3>
        <p className="text-text-secondary text-sm">No transaction data to display.</p>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <Card>
        <h3 className="text-lg font-semibold mb-4">Monthly cash flow</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={2}>
              <XAxis
                dataKey="month"
                tick={{ fill: '#94A3B8', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#64748B', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
              />
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
              <Bar dataKey="Income" radius={[4, 4, 0, 0]} animationDuration={800}>
                {data.map((_, i) => (
                  <Cell key={i} fill="#10B981" />
                ))}
              </Bar>
              <Bar dataKey="Spending" radius={[4, 4, 0, 0]} animationDuration={800}>
                {data.map((_, i) => (
                  <Cell key={i} fill="#F43F5E" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex gap-6 mt-3 justify-center text-xs text-text-secondary">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-success" />
            Income
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-danger" />
            Spending
          </span>
        </div>
      </Card>
    </motion.div>
  );
}
