import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { benchmarkService } from '../services/benchmarkService';
import type { BenchmarkResult, PercentileResult, BenchmarkFilters } from '../services/benchmarkService';
import {
  BarChart3, TrendingUp, Users, ChevronDown, Sparkles, Target,
  ArrowUp, ArrowDown, Minus, Filter, Lightbulb,
} from 'lucide-react';

const AGE_OPTIONS = [
  { value: '', label: 'Any Age' },
  { value: 'AGE_18_24', label: '18–24' }, { value: 'AGE_25_34', label: '25–34' },
  { value: 'AGE_35_44', label: '35–44' }, { value: 'AGE_45_54', label: '45–54' },
  { value: 'AGE_55_64', label: '55–64' }, { value: 'AGE_65_PLUS', label: '65+' },
];

const INCOME_OPTIONS = [
  { value: '', label: 'Any Income' },
  { value: 'UNDER_25K', label: '<$25K' }, { value: 'RANGE_25K_50K', label: '$25K–$50K' },
  { value: 'RANGE_50K_75K', label: '$50K–$75K' }, { value: 'RANGE_75K_100K', label: '$75K–$100K' },
  { value: 'RANGE_100K_150K', label: '$100K–$150K' }, { value: 'RANGE_150K_PLUS', label: '$150K+' },
];

function getPercentileColor(p: number): string {
  if (p >= 75) return 'text-emerald-400';
  if (p >= 50) return 'text-cyan-400';
  if (p >= 25) return 'text-amber-400';
  return 'text-red-400';
}

function getPercentileIcon(p: number) {
  if (p >= 60) return ArrowUp;
  if (p >= 40) return Minus;
  return ArrowDown;
}

function PercentileBar({ result, delay = 0 }: { result: PercentileResult; delay?: number }) {
  const color = getPercentileColor(result.percentile);
  const Icon = getPercentileIcon(result.percentile);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="py-3 border-b border-slate-700/30 last:border-0"
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium">{result.label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary">
            You: <span className="text-text-primary font-semibold">{result.value}</span>
          </span>
          <span className="text-xs text-text-secondary">
            Avg: {result.cohortAvg}
          </span>
        </div>
      </div>

      <div className="relative h-6 bg-slate-700/30 rounded-full overflow-hidden">
        {/* Cohort average marker */}
        <div
          className="absolute top-0 h-full w-px bg-slate-500 z-10"
          style={{ left: `${result.cohortAvg}%` }}
        />
        <div
          className="absolute -top-0.5 text-[8px] text-text-secondary z-10"
          style={{ left: `${Math.max(2, Math.min(result.cohortAvg - 3, 90))}%` }}
        >
          avg
        </div>

        {/* User bar */}
        <motion.div
          className="absolute top-0 h-full rounded-full bg-gradient-to-r from-primary/80 to-primary"
          initial={{ width: 0 }}
          animate={{ width: `${result.value}%` }}
          transition={{ duration: 1, delay: delay + 0.2, ease: 'easeOut' }}
        />
      </div>

      <div className="flex items-center justify-between mt-1">
        <div className={`flex items-center gap-1 text-xs font-semibold ${color}`}>
          <Icon className="w-3 h-3" />
          Top {Math.max(1, 100 - result.percentile)}%
        </div>
        <span className="text-[10px] text-text-secondary">
          Better than {result.percentile}% of your cohort
        </span>
      </div>
    </motion.div>
  );
}

function HeroPercentile({ result }: { result: PercentileResult }) {
  const color = getPercentileColor(result.percentile);
  const r = 58;
  const c = 2 * Math.PI * r;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: 140, height: 140 }}>
        <svg width={140} height={140} style={{ transform: 'rotate(-90deg)' }} className="absolute inset-0">
          <circle cx={70} cy={70} r={r} fill="none" stroke="currentColor" className="text-slate-700/30" strokeWidth={10} />
          <motion.circle
            cx={70} cy={70} r={r} fill="none" stroke="url(#bmGrad)" strokeWidth={10} strokeLinecap="round"
            initial={{ strokeDasharray: c, strokeDashoffset: c }}
            animate={{ strokeDashoffset: c * (1 - result.percentile / 100) }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
          <defs>
            <linearGradient id="bmGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-black ${color}`}>{result.percentile}</span>
          <span className="text-[10px] text-text-secondary">percentile</span>
        </div>
      </div>
      <p className="text-sm font-semibold mt-2">Overall Vivid Score: {result.value}</p>
      <p className="text-xs text-text-secondary">
        Better than {result.percentile}% of your peers
      </p>
    </div>
  );
}

function InsightsCard({ insights }: { insights: string[] }) {
  if (insights.length === 0) return null;
  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-amber-400" /> Personalized Insights
      </h3>
      <div className="space-y-2">
        {insights.map((insight, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-start gap-2 text-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
            <span className="text-text-secondary">{insight}</span>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}

function FilterBar({ filters, onChange }: { filters: BenchmarkFilters; onChange: (f: BenchmarkFilters) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <Card className="p-3">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 w-full text-sm">
        <Filter className="w-4 h-4 text-primary" />
        <span className="font-medium">Compare With</span>
        <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3 space-y-3">
          <div>
            <label className="text-[10px] text-text-secondary uppercase tracking-wider mb-1 block">Age</label>
            <div className="flex flex-wrap gap-1.5">
              {AGE_OPTIONS.map((a) => (
                <button key={a.value} onClick={() => onChange({ ...filters, ageRange: a.value || undefined })}
                  className={`px-2.5 py-1 text-[11px] rounded-lg border transition-colors ${filters.ageRange === a.value || (!filters.ageRange && !a.value) ? 'bg-primary/15 border-primary/40 text-primary' : 'border-slate-700 hover:bg-bg-elevated'}`}
                >{a.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] text-text-secondary uppercase tracking-wider mb-1 block">State</label>
            <input
              placeholder="e.g. California"
              value={filters.state ?? ''}
              onChange={(e) => onChange({ ...filters, state: e.target.value || undefined })}
              className="w-48 px-2.5 py-1.5 text-xs bg-bg-elevated border border-slate-700 rounded-lg focus:border-primary outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] text-text-secondary uppercase tracking-wider mb-1 block">Income</label>
            <div className="flex flex-wrap gap-1.5">
              {INCOME_OPTIONS.map((i) => (
                <button key={i.value} onClick={() => onChange({ ...filters, incomeRange: i.value || undefined })}
                  className={`px-2.5 py-1 text-[11px] rounded-lg border transition-colors ${filters.incomeRange === i.value || (!filters.incomeRange && !i.value) ? 'bg-primary/15 border-primary/40 text-primary' : 'border-slate-700 hover:bg-bg-elevated'}`}
                >{i.label}</button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </Card>
  );
}

export function BenchmarkPage() {
  const [filters, setFilters] = useState<BenchmarkFilters>({});

  const { data, isLoading } = useQuery<BenchmarkResult>({
    queryKey: ['benchmark', filters],
    queryFn: () => benchmarkService.get(filters),
  });

  return (
    <PageWrapper>
      <div className="max-w-3xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-primary" /> How Do I Compare?
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Anonymous benchmarks against people like you. No PII leaves the system.
          </p>
        </motion.div>

        <FilterBar filters={filters} onChange={setFilters} />

        {isLoading && <Spinner className="mx-auto mt-16" />}

        {data && (
          <>
            {/* Cohort Badge */}
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <Users className="w-3.5 h-3.5" />
              Comparing against: <span className="text-text-primary font-medium">{data.cohort.description}</span>
            </div>

            {/* Hero */}
            <Card className="p-6 flex flex-col items-center">
              <HeroPercentile result={data.overall} />
            </Card>

            {/* Pillar Breakdown */}
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" /> Pillar Breakdown
              </h3>
              {Object.values(data.pillars).map((p, i) => (
                <PercentileBar key={p.label} result={p} delay={i * 0.1} />
              ))}
            </Card>

            {/* Financial Metrics */}
            <div className="grid md:grid-cols-2 gap-3">
              <Card className="p-4">
                <h3 className="text-sm font-semibold mb-2">Savings Rate</h3>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-black">{data.savingsRate.value}%</span>
                  <span className={`text-xs font-semibold mb-1 ${getPercentileColor(data.savingsRate.percentile)}`}>
                    Top {Math.max(1, 100 - data.savingsRate.percentile)}%
                  </span>
                </div>
                <p className="text-[10px] text-text-secondary mt-1">
                  Cohort avg: {data.savingsRate.cohortAvg}% · Median: {data.savingsRate.cohortMedian}%
                </p>
                <div className="h-1.5 bg-slate-700/30 rounded-full mt-2 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, Math.max(0, data.savingsRate.value + 50))}%` }}
                    transition={{ duration: 1 }}
                  />
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="text-sm font-semibold mb-2">Debt-to-Income</h3>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-black">{data.debtToIncome.value}%</span>
                  <span className={`text-xs font-semibold mb-1 ${getPercentileColor(data.debtToIncome.percentile)}`}>
                    Top {Math.max(1, 100 - data.debtToIncome.percentile)}%
                  </span>
                </div>
                <p className="text-[10px] text-text-secondary mt-1">
                  Cohort avg: {data.debtToIncome.cohortAvg}% · Danger: 43%
                </p>
                <div className="h-1.5 bg-slate-700/30 rounded-full mt-2 overflow-hidden relative">
                  <div className="absolute top-0 h-full w-px bg-red-500/50" style={{ left: '43%' }} />
                  <motion.div
                    className={`h-full rounded-full ${data.debtToIncome.value > 43 ? 'bg-gradient-to-r from-red-500 to-orange-400' : 'bg-gradient-to-r from-emerald-500 to-cyan-400'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, data.debtToIncome.value)}%` }}
                    transition={{ duration: 1 }}
                  />
                </div>
              </Card>
            </div>

            <InsightsCard insights={data.insights} />

            {/* Privacy Notice */}
            <Card className="p-4 border-slate-700/30">
              <div className="flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="text-xs text-text-secondary">
                  <p className="font-medium text-text-primary mb-1">100% Anonymous</p>
                  <p>Your individual data never leaves Vivid. Benchmarks are computed from aggregate, anonymized statistics across all users. No personally identifiable information is shared or exposed.</p>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>
    </PageWrapper>
  );
}
