import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { timeMachineService } from '../services/timeMachineService';
import type { ScenarioPreset, TimeMachineResult } from '../services/timeMachineService';
import {
  Clock, TrendingUp, TrendingDown, Zap, Shield, DollarSign,
  AlertTriangle, Minus, Check, Play, RotateCcw,
  Wallet, PiggyBank, CreditCard, ArrowRight,
} from 'lucide-react';

const PILLAR_LABELS: Record<string, string> = {
  incomeStability: 'Income Stability',
  spendingDiscipline: 'Spending Discipline',
  debtTrajectory: 'Debt Trajectory',
  financialResilience: 'Financial Resilience',
  growthMomentum: 'Growth Momentum',
};

const SCENARIO_ICONS: Record<string, typeof Clock> = {
  'Keep Living Like This': Clock,
  '+$200/month to savings': PiggyBank,
  'Cancel Netflix + DoorDash': Minus,
  'Pay extra $300 toward debt': CreditCard,
  'Lose one income stream': AlertTriangle,
  'Switch to salaried job': Shield,
  'Raise income 15%': TrendingUp,
  'Emergency expense $2,000': Zap,
};

function MetricCard({
  label, current, projected, suffix, invertColors,
}: {
  label: string; current: number; projected: number; suffix?: string;
  invertColors?: boolean;
}) {
  const delta = projected - current;
  const isGood = invertColors ? delta < 0 : delta > 0;
  const isBad = invertColors ? delta > 0 : delta < 0;

  return (
    <Card className="text-center">
      <p className="text-xs text-text-secondary mb-1">{label}</p>
      <motion.p
        key={projected}
        initial={{ scale: 1.15, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="text-2xl font-bold"
      >
        {typeof projected === 'number' && projected >= 1000
          ? `$${projected.toLocaleString()}`
          : `${projected}${suffix ?? ''}`}
      </motion.p>
      {delta !== 0 && (
        <motion.p
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-xs font-medium mt-1 flex items-center justify-center gap-0.5 ${
            isGood ? 'text-success' : isBad ? 'text-danger' : 'text-text-secondary'
          }`}
        >
          {isGood ? <TrendingUp className="h-3 w-3" /> : isBad ? <TrendingDown className="h-3 w-3" /> : null}
          {delta > 0 ? '+' : ''}{typeof delta === 'number' && Math.abs(delta) >= 100
            ? `$${delta.toLocaleString()}`
            : delta}{suffix && Math.abs(delta) < 100 ? suffix : ''}
        </motion.p>
      )}
      <p className="text-[10px] text-text-secondary mt-0.5">
        Current: {typeof current === 'number' && current >= 1000
          ? `$${current.toLocaleString()}`
          : `${current}${suffix ?? ''}`}
      </p>
    </Card>
  );
}

export function TimeMachinePage() {
  const { data: presets, isLoading: presetsLoading } = useQuery({
    queryKey: ['time-machine-presets'],
    queryFn: timeMachineService.getPresets,
  });

  const [activePresets, setActivePresets] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<TimeMachineResult | null>(null);

  const { mutate: runSimulation, isPending: simulating } = useMutation({
    mutationFn: (selectedModifiers: Partial<ScenarioPreset>[]) =>
      timeMachineService.simulate(selectedModifiers),
    onSuccess: setResult,
  });

  const togglePreset = useCallback((preset: ScenarioPreset) => {
    setActivePresets((prev) => {
      const next = new Set(prev);
      if (next.has(preset.id)) next.delete(preset.id);
      else next.add(preset.id);
      return next;
    });
  }, []);

  const selectedModifiers = useMemo(() => {
    if (!presets) return [];
    if (activePresets.size === 0) {
      return [presets[0]];
    }
    return presets.filter((p) => activePresets.has(p.id));
  }, [presets, activePresets]);

  const handleSimulate = useCallback(() => {
    runSimulation(selectedModifiers);
  }, [selectedModifiers, runSimulation]);

  const handleReset = useCallback(() => {
    setActivePresets(new Set());
    setResult(null);
  }, []);

  // Radar data
  const radarData = useMemo(() => {
    if (!result) return [];
    return Object.entries(PILLAR_LABELS).map(([key, label]) => ({
      pillar: label.replace('Financial ', 'Fin. '),
      current: result.currentScores[key as keyof typeof result.currentScores],
      projected: result.projectedScores[key as keyof typeof result.projectedScores],
    }));
  }, [result]);

  // Balance projection chart
  const balanceData = useMemo(() => {
    if (!result) return [];
    return result.projectedMonths.map((m) => ({
      month: m.month.slice(5),
      balance: m.endBalance,
      savings: m.netSavings,
    }));
  }, [result]);

  if (presetsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Spinner />
        <p className="text-text-secondary text-sm">Loading Time Machine...</p>
      </div>
    );
  }

  return (
    <PageWrapper title="Vivid Time Machine™">
      <p className="text-text-secondary mb-8 max-w-2xl">
        Show me who I'll be in 12 months. Select life decisions below and watch
        your financial future unfold — based on your real transaction behavior.
      </p>

      {/* Scenario Toggle Grid */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-text-secondary mb-3">
          What happens if you...
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {presets?.map((preset) => {
            const isActive = activePresets.has(preset.id);
            const Icon = SCENARIO_ICONS[preset.label] ?? Zap;
            return (
              <motion.button
                key={preset.id}
                onClick={() => togglePreset(preset)}
                whileTap={{ scale: 0.97 }}
                className={`p-4 rounded-2xl border text-left transition-all duration-200 ${
                  isActive
                    ? 'bg-primary/10 border-primary/40 ring-1 ring-primary/30'
                    : 'bg-bg-elevated border-slate-700/50 hover:border-slate-500'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl ${isActive ? 'bg-primary/20 text-primary' : 'bg-bg-surface text-text-secondary'}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold ${isActive ? 'text-primary' : ''}`}>
                      {preset.label}
                    </p>
                    <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">
                      {preset.description}
                    </p>
                  </div>
                  {isActive && (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-8">
        <Button
          onClick={handleSimulate}
          disabled={simulating}
          className="flex items-center gap-2 px-6"
        >
          {simulating ? (
            <Spinner className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {simulating ? 'Simulating...' : 'Simulate My Future'}
        </Button>
        {result && (
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        )}
        {activePresets.size > 0 && (
          <span className="flex items-center text-xs text-text-secondary">
            {activePresets.size} scenario{activePresets.size > 1 ? 's' : ''} selected
          </span>
        )}
      </div>

      {/* Results */}
      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
          >
            {/* Active modifiers */}
            <div className="flex flex-wrap gap-2">
              {result.activeModifiers.map((label) => (
                <span key={label} className="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 font-medium">
                  {label}
                </span>
              ))}
              <span className="text-xs px-3 py-1.5 rounded-lg bg-bg-elevated text-text-secondary border border-slate-700">
                {result.monthsProjected} months projected
              </span>
            </div>

            {/* Animated Radar Chart */}
            <Card>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Your Scores — Now vs. 12 Months
              </h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis
                      dataKey="pillar"
                      tick={{ fill: '#94A3B8', fontSize: 11 }}
                    />
                    <PolarRadiusAxis
                      domain={[0, 100]}
                      tick={{ fill: '#64748B', fontSize: 10 }}
                      axisLine={false}
                    />
                    <Radar
                      name="Current"
                      dataKey="current"
                      stroke="#64748B"
                      fill="#64748B"
                      fillOpacity={0.1}
                      strokeWidth={1.5}
                      strokeDasharray="6 4"
                      dot={{ r: 3, fill: '#64748B', strokeWidth: 0 }}
                    />
                    <Radar
                      name="Projected"
                      dataKey="projected"
                      stroke="#6B21A8"
                      fill="url(#projectedGradient)"
                      fillOpacity={0.5}
                      strokeWidth={2}
                      dot={{ r: 4, fill: '#6B21A8', strokeWidth: 0 }}
                      isAnimationActive={true}
                      animationDuration={1200}
                      animationEasing="ease-out"
                    />
                    <defs>
                      <linearGradient id="projectedGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6B21A8" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="#6B21A8" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Score delta legend */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
                {Object.entries(PILLAR_LABELS).map(([key, label]) => {
                  const delta = result.scoreDeltas[key] ?? 0;
                  const projected = result.projectedScores[key as keyof typeof result.projectedScores];
                  return (
                    <div key={key} className="flex flex-col items-center text-center">
                      <p className="text-xs text-text-secondary">{label}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <motion.span
                          key={projected}
                          initial={{ scale: 1.3 }}
                          animate={{ scale: 1 }}
                          className="text-lg font-bold"
                        >
                          {Math.round(projected)}
                        </motion.span>
                        {delta !== 0 && (
                          <span className={`text-xs font-medium ${delta > 0 ? 'text-success' : 'text-danger'}`}>
                            {delta > 0 ? '+' : ''}{delta}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center gap-4 text-xs text-text-secondary justify-center">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-6 border-t-2 border-dashed border-slate-400" />
                  Current
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-6 border-t-2 border-purple-600" />
                  Projected
                </span>
              </div>
            </Card>

            {/* Key Metrics */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ArrowRight className="h-5 w-5 text-primary" />
                Projected Outcomes
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  label="Net Worth"
                  current={result.metrics.currentNetWorth}
                  projected={result.metrics.projectedNetWorth}
                />
                <MetricCard
                  label="Emergency Runway"
                  current={result.metrics.currentEmergencyRunway}
                  projected={result.metrics.projectedEmergencyRunway}
                  suffix=" months"
                />
                <MetricCard
                  label="Loan Approval Odds"
                  current={0}
                  projected={result.metrics.loanApprovalProbability}
                  suffix="%"
                />
                <MetricCard
                  label="Overdraft Risk"
                  current={0}
                  projected={result.metrics.overdraftProbability}
                  suffix="%"
                  invertColors
                />
              </div>
            </div>

            {/* Secondary Metrics */}
            <div className="grid sm:grid-cols-3 gap-4">
              <Card className="text-center">
                <p className="text-xs text-text-secondary mb-1">Overall Score Change</p>
                <p className={`text-3xl font-bold ${
                  (result.scoreDeltas.overall ?? 0) > 0 ? 'text-success'
                    : (result.scoreDeltas.overall ?? 0) < 0 ? 'text-danger' : ''
                }`}>
                  {(result.scoreDeltas.overall ?? 0) > 0 ? '+' : ''}
                  {result.scoreDeltas.overall ?? 0}
                </p>
                <p className="text-xs text-text-secondary mt-1">
                  {Math.round(result.currentScores.overall)} → {Math.round(result.projectedScores.overall)}
                </p>
              </Card>
              <Card className="text-center">
                <p className="text-xs text-text-secondary mb-1">Total Saved (or Lost)</p>
                <p className={`text-3xl font-bold ${
                  result.metrics.totalSavedOrLost > 0 ? 'text-success' : 'text-danger'
                }`}>
                  {result.metrics.totalSavedOrLost > 0 ? '+' : ''}
                  ${Math.abs(result.metrics.totalSavedOrLost).toLocaleString()}
                </p>
                <p className="text-xs text-text-secondary mt-1">over {result.monthsProjected} months</p>
              </Card>
              <Card className="text-center">
                <p className="text-xs text-text-secondary mb-1">Net Worth Change</p>
                <p className={`text-3xl font-bold ${
                  result.metrics.netWorthChange > 0 ? 'text-success' : 'text-danger'
                }`}>
                  {result.metrics.netWorthChange > 0 ? '+' : ''}
                  ${Math.abs(result.metrics.netWorthChange).toLocaleString()}
                </p>
              </Card>
            </div>

            {/* Balance Projection Chart */}
            <Card>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Projected Balance Over Time
              </h3>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={balanceData}>
                    <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fill: '#94A3B8', fontSize: 11 }} />
                    <YAxis
                      tick={{ fill: '#94A3B8', fontSize: 11 }}
                      tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1E293B',
                        border: '1px solid #334155',
                        borderRadius: '12px',
                        color: '#F8FAFC',
                        fontSize: '12px',
                      }}
                      formatter={(value: number) => [`$${value.toLocaleString()}`, 'Balance']}
                    />
                    <defs>
                      <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6B21A8" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6B21A8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="balance"
                      stroke="#6B21A8"
                      fill="url(#balanceGradient)"
                      strokeWidth={2}
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Monthly Breakdown */}
            <Card>
              <h3 className="text-lg font-semibold mb-4">Monthly Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-text-secondary border-b border-slate-700">
                      <th className="py-2 text-left font-medium">Month</th>
                      <th className="py-2 text-right font-medium">Income</th>
                      <th className="py-2 text-right font-medium">Spending</th>
                      <th className="py-2 text-right font-medium">Net</th>
                      <th className="py-2 text-right font-medium">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.projectedMonths.map((m) => (
                      <tr key={m.month} className="border-b border-slate-700/30">
                        <td className="py-2 font-medium">{m.month}</td>
                        <td className="py-2 text-right text-success">${m.totalDeposits.toLocaleString()}</td>
                        <td className="py-2 text-right text-danger">${m.totalSpending.toLocaleString()}</td>
                        <td className={`py-2 text-right font-medium ${m.netSavings >= 0 ? 'text-success' : 'text-danger'}`}>
                          {m.netSavings >= 0 ? '+' : ''}${m.netSavings.toLocaleString()}
                        </td>
                        <td className={`py-2 text-right font-bold ${m.endBalance >= 0 ? '' : 'text-danger'}`}>
                          ${m.endBalance.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Initial prompt when no result */}
      {!result && !simulating && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <Clock className="h-16 w-16 text-primary/30 mx-auto mb-4" />
          <p className="text-xl font-semibold mb-2">What happens if you keep living exactly like this?</p>
          <p className="text-text-secondary text-sm max-w-md mx-auto mb-6">
            Select scenarios above (or none for baseline) and hit "Simulate My Future"
            to see your financial trajectory animated forward 12 months.
          </p>
        </motion.div>
      )}
    </PageWrapper>
  );
}
