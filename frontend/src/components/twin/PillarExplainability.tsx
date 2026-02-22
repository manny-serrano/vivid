import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../ui/Card';
import { ScoreMeter } from '../ui/ScoreMeter';
import { fetchPillarExplanations } from '../../services/twinService';
import type { PillarExplanation, InfluentialTransaction } from '../../services/twinService';
import { RADAR_COLORS } from '../../utils/chartHelpers';
import {
  ChevronDown, TrendingUp, TrendingDown, ArrowRight,
  CheckCircle2, AlertTriangle, Info,
} from 'lucide-react';

const PILLAR_ICONS: Record<string, string> = {
  incomeStabilityScore: '💰',
  spendingDisciplineScore: '🎯',
  debtTrajectoryScore: '📉',
  financialResilienceScore: '🛡️',
  growthMomentumScore: '🚀',
};

function TransactionChip({ tx }: { tx: InfluentialTransaction }) {
  const isPositive = tx.impact === 'positive';
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border text-sm ${
      isPositive ? 'bg-success/5 border-success/20' : 'bg-danger/5 border-danger/20'
    }`}>
      <div className={`shrink-0 mt-0.5 ${isPositive ? 'text-success' : 'text-danger'}`}>
        {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">{tx.merchantName}</span>
          {tx.amount !== 0 && (
            <span className={`text-xs font-semibold ${isPositive ? 'text-success' : 'text-danger'}`}>
              {tx.amount > 0 ? '+' : '-'}${Math.abs(tx.amount).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          )}
          <span className="text-xs text-text-secondary ml-auto shrink-0">
            {new Date(tx.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        </div>
        <p className="text-xs text-text-secondary mt-0.5">{tx.reason}</p>
      </div>
    </div>
  );
}

function PillarCard({ explanation }: { explanation: PillarExplanation }) {
  const [expanded, setExpanded] = useState(false);
  const color = RADAR_COLORS[explanation.pillarKey] ?? '#94A3B8';
  const icon = PILLAR_ICONS[explanation.pillarKey] ?? '📊';

  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="text-xl">{icon}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <p className="font-semibold">{explanation.pillar}</p>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <ScoreMeter score={explanation.score} showLabel={false} className="flex-1 max-w-[120px]" />
                <span className="text-lg font-bold">{Math.round(explanation.score)}</span>
                <span className="text-xs text-text-secondary">/100</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-text-secondary">
              {explanation.reasons.length} factors
            </span>
            <ChevronDown className={`h-5 w-5 text-text-secondary transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-slate-700/30 space-y-4">
              {/* Bullet reasons */}
              <div>
                <p className="text-xs font-medium text-text-secondary mb-2 flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  Why this score
                </p>
                <ul className="space-y-2">
                  {explanation.reasons.map((reason, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <ArrowRight className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <span className="text-text-secondary">{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Influential transactions */}
              {explanation.influentialTransactions.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-text-secondary mb-2 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Key transactions
                  </p>
                  <div className="space-y-2">
                    {explanation.influentialTransactions.map((tx, i) => (
                      <TransactionChip key={i} tx={tx} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

export function PillarExplainability() {
  const { data: report, isLoading } = useQuery({
    queryKey: ['pillar-explanations'],
    queryFn: fetchPillarExplanations,
  });

  if (isLoading || !report) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
    >
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-semibold">Score Explainability</h3>
        <span className="text-xs text-text-secondary bg-bg-elevated px-2 py-0.5 rounded-md">
          Tap each pillar to see why
        </span>
      </div>
      <div className="space-y-3">
        {report.pillars.map((p) => (
          <PillarCard key={p.pillarKey} explanation={p} />
        ))}
      </div>
    </motion.div>
  );
}
