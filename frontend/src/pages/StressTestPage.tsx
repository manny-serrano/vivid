import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQuery } from '@tanstack/react-query';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ScoreMeter } from '../components/ui/ScoreMeter';
import { insightsService } from '../services/insightsService';
import type { RunwayResult, StressTestInput } from '../services/insightsService';
import {
  Zap, TrendingDown, TrendingUp, ShieldAlert, Clock,
  ArrowDown, ArrowRight, Lightbulb, ChevronDown,
} from 'lucide-react';

const SEVERITY_STYLES = {
  low: { bg: 'bg-success/10', border: 'border-success/30', text: 'text-success', label: 'Low Impact' },
  moderate: { bg: 'bg-warning/10', border: 'border-warning/30', text: 'text-warning', label: 'Moderate Impact' },
  high: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', label: 'High Impact' },
  critical: { bg: 'bg-danger/10', border: 'border-danger/30', text: 'text-danger', label: 'Critical Impact' },
};

export function StressTestPage() {
  const [selectedScenario, setSelectedScenario] = useState('lose_primary_income');
  const [customIncome, setCustomIncome] = useState('');
  const [customExpense, setCustomExpense] = useState('');
  const [customEmergency, setCustomEmergency] = useState('');
  const [result, setResult] = useState<RunwayResult | null>(null);
  const [showNarrative, setShowNarrative] = useState(false);

  const { data: scenarios } = useQuery({
    queryKey: ['stress-scenarios'],
    queryFn: insightsService.getScenarios,
  });

  const mutation = useMutation({
    mutationFn: insightsService.runStressTest,
    onSuccess: (data) => {
      setResult(data);
      setShowNarrative(false);
    },
  });

  const handleRun = () => {
    const input: StressTestInput = { scenarioId: selectedScenario };
    if (selectedScenario === 'custom') {
      input.incomeReductionPercent = Number(customIncome) || 0;
      input.expenseIncreasePercent = Number(customExpense) || 0;
      input.emergencyExpense = Number(customEmergency) || 0;
    }
    mutation.mutate(input);
  };

  const activeScenario = (scenarios ?? []).find((s) => s.id === selectedScenario);
  const sev = result ? SEVERITY_STYLES[result.impactSeverity] : null;

  return (
    <PageWrapper title="Predictive Stress Testing">
      <p className="text-text-secondary mb-8 max-w-2xl">
        Run "What-If" simulations against your Financial Twin. See how many months
        of runway you'd have if life threw a curveball — something FICO can't tell you.
      </p>

      {/* Scenario Picker */}
      <Card className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Choose a scenario
        </h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {(scenarios ?? []).map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedScenario(s.id)}
              className={`text-left p-3 rounded-xl border transition-all ${
                selectedScenario === s.id
                  ? 'bg-primary/10 border-primary/40 ring-1 ring-primary/20'
                  : 'bg-bg-elevated border-slate-700 hover:border-slate-500'
              }`}
            >
              <p className="text-sm font-medium">{s.label}</p>
              <p className="text-xs text-text-secondary mt-1">{s.description}</p>
            </button>
          ))}
        </div>

        <AnimatePresence>
          {selectedScenario === 'custom' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="grid sm:grid-cols-3 gap-4 mb-4 overflow-hidden"
            >
              <div>
                <label className="text-sm text-text-secondary block mb-1">Income reduction (%)</label>
                <input
                  type="number" placeholder="e.g. 50" value={customIncome}
                  onChange={(e) => setCustomIncome(e.target.value)}
                  className="w-full bg-bg-elevated border border-slate-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="text-sm text-text-secondary block mb-1">Expense increase (%)</label>
                <input
                  type="number" placeholder="e.g. 30" value={customExpense}
                  onChange={(e) => setCustomExpense(e.target.value)}
                  className="w-full bg-bg-elevated border border-slate-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="text-sm text-text-secondary block mb-1">Emergency expense ($)</label>
                <input
                  type="number" placeholder="e.g. 5000" value={customEmergency}
                  onChange={(e) => setCustomEmergency(e.target.value)}
                  className="w-full bg-bg-elevated border border-slate-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Button onClick={handleRun} disabled={mutation.isPending}>
          {mutation.isPending ? 'Simulating...' : 'Run Simulation'}
        </Button>
        {mutation.isError && (
          <p className="text-danger text-sm mt-2">Simulation failed. Make sure your Financial Twin exists.</p>
        )}
      </Card>

      {/* Results */}
      <AnimatePresence>
        {result && sev && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="space-y-6"
          >
            {/* Impact Banner */}
            <div className={`p-6 rounded-2xl border ${sev.bg} ${sev.border}`}>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className={`text-sm font-medium ${sev.text}`}>{sev.label}</p>
                  <p className="text-3xl font-bold mt-1 flex items-center gap-3">
                    <Clock className="h-8 w-8" />
                    {result.monthsOfRunway >= 36 ? '36+' : result.monthsOfRunway} months of runway
                  </p>
                  <p className="text-text-secondary text-sm mt-1">
                    Scenario: {activeScenario?.label ?? 'Custom'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-text-secondary mb-1">Adjusted Resilience</p>
                  <p className="text-4xl font-bold">{result.adjustedResilience}</p>
                  <p className="text-xs text-text-secondary">/100</p>
                </div>
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <h3 className="text-sm font-medium text-text-secondary mb-4">Financial Comparison</h3>
                <div className="space-y-3">
                  <ComparisonRow
                    label="Monthly Income"
                    current={result.breakdown.currentMonthlyIncome}
                    simulated={result.breakdown.simulatedMonthlyIncome}
                  />
                  <ComparisonRow
                    label="Monthly Expenses"
                    current={result.breakdown.currentMonthlyExpenses}
                    simulated={result.breakdown.simulatedMonthlyExpenses}
                  />
                  <ComparisonRow
                    label="Monthly Surplus"
                    current={result.breakdown.currentMonthlySurplus}
                    simulated={result.breakdown.simulatedMonthlySurplus}
                  />
                  <div className="pt-2 border-t border-slate-700/50">
                    <p className="text-sm text-text-secondary">Estimated Savings Buffer</p>
                    <p className="text-lg font-bold">${result.breakdown.estimatedSavings.toLocaleString()}</p>
                  </div>
                </div>
              </Card>

              <Card>
                <h3 className="text-sm font-medium text-text-secondary mb-4">Adjusted Vivid Scores</h3>
                <div className="space-y-3">
                  {([
                    ['Income Stability', result.adjustedScores.incomeStability],
                    ['Spending Discipline', result.adjustedScores.spendingDiscipline],
                    ['Debt Trajectory', result.adjustedScores.debtTrajectory],
                    ['Financial Resilience', result.adjustedScores.financialResilience],
                    ['Growth Momentum', result.adjustedScores.growthMomentum],
                  ] as [string, number][]).map(([label, score]) => (
                    <div key={label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-text-secondary">{label}</span>
                        <span className="font-medium">{score}</span>
                      </div>
                      <ScoreMeter score={score} showLabel={false} />
                    </div>
                  ))}
                  <div className="pt-2 border-t border-slate-700/50 flex justify-between">
                    <span className="font-medium">Overall</span>
                    <span className="text-xl font-bold">{result.adjustedScores.overall}/100</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Recommendations */}
            <Card>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-warning" />
                Recommendations
              </h3>
              <ul className="space-y-3">
                {result.recommendations.map((rec, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-3 text-sm"
                  >
                    <span className="shrink-0 mt-0.5 h-5 w-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </span>
                    <span>{rec}</span>
                  </motion.li>
                ))}
              </ul>
            </Card>

            {/* AI Narrative (expandable) */}
            {result.aiNarrative && (
              <Card>
                <button
                  onClick={() => setShowNarrative(!showNarrative)}
                  className="w-full flex items-center justify-between"
                >
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-primary" />
                    AI Analysis
                  </h3>
                  <ChevronDown className={`h-5 w-5 text-text-secondary transition-transform ${showNarrative ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {showNarrative && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">
                        {result.aiNarrative}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
}

function ComparisonRow({ label, current, simulated }: { label: string; current: number; simulated: number }) {
  const diff = simulated - current;
  const isNegative = diff < 0;
  return (
    <div>
      <p className="text-sm text-text-secondary">{label}</p>
      <div className="flex items-center gap-3">
        <span className="text-lg font-bold">${current.toLocaleString()}</span>
        <ArrowRight className="h-4 w-4 text-text-secondary" />
        <span className={`text-lg font-bold ${isNegative ? 'text-danger' : simulated > current ? 'text-warning' : 'text-success'}`}>
          ${simulated.toLocaleString()}
        </span>
        {diff !== 0 && (
          <span className={`text-xs flex items-center gap-0.5 ${isNegative ? 'text-danger' : 'text-warning'}`}>
            {isNegative ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
            {isNegative ? '' : '+'}${diff.toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
}
