import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { TwinRadarChart } from './TwinRadarChart';
import { TwinScoreCard } from './TwinScoreCard';
import { TwinTimeline } from './TwinTimeline';
import { SpendingBreakdown } from './SpendingBreakdown';
import { InteractiveNarrative } from './InteractiveNarrative';
import { PillarExplainability } from './PillarExplainability';
import { TwinVerificationBadge } from './TwinVerificationBadge';
import { TwinPDFExport } from './TwinPDFExport';
import { ScoreMeter } from '../ui/ScoreMeter';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import type { TwinProfile } from '../../services/twinService';
import { fetchSnapshots, fetchCategoryAggregates, regenerateTwin } from '../../services/twinService';
import { RADAR_COLORS } from '../../utils/chartHelpers';

interface TwinDashboardProps {
  twin: TwinProfile;
}

const DIMENSIONS = [
  { key: 'incomeStabilityScore', label: 'Income Stability' },
  { key: 'spendingDisciplineScore', label: 'Spending Discipline' },
  { key: 'debtTrajectoryScore', label: 'Debt Trajectory' },
  { key: 'financialResilienceScore', label: 'Financial Resilience' },
  { key: 'growthMomentumScore', label: 'Growth Momentum' },
] as const;

const LOAN_TYPES = [
  { key: 'personalLoanReadiness', label: 'Personal' },
  { key: 'autoLoanReadiness', label: 'Auto' },
  { key: 'mortgageReadiness', label: 'Mortgage' },
  { key: 'smallBizReadiness', label: 'Small Business' },
] as const;

export function TwinDashboard({ twin }: TwinDashboardProps) {
  const queryClient = useQueryClient();
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null);

  const refreshMutation = useMutation({
    mutationFn: regenerateTwin,
    onSuccess: () => {
      setRefreshMsg('Twin is regenerating — this may take a moment...');
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['twin'] });
        queryClient.invalidateQueries({ queryKey: ['twin-snapshots'] });
        queryClient.invalidateQueries({ queryKey: ['category-aggregates'] });
        setRefreshMsg(null);
      }, 5000);
    },
    onError: () => {
      setRefreshMsg('Failed to refresh. Please try again.');
      setTimeout(() => setRefreshMsg(null), 4000);
    },
  });

  const { data: snapshots } = useQuery({
    queryKey: ['twin-snapshots'],
    queryFn: fetchSnapshots,
  });

  const { data: categoryAggregates } = useQuery({
    queryKey: ['category-aggregates'],
    queryFn: fetchCategoryAggregates,
  });

  const dimensions = DIMENSIONS.map((d) => ({
    key: d.key,
    label: d.label,
    score: twin[d.key] as number,
  }));

  const previousSnapshot = snapshots && snapshots.length > 0
    ? snapshots[snapshots.length - 1]
    : null;

  const ghostDimensions = previousSnapshot
    ? DIMENSIONS.map((d) => ({
        key: d.key,
        label: d.label,
        score: previousSnapshot[d.key] as number,
      }))
    : undefined;

  const ghostLabel = previousSnapshot
    ? `Previous (${new Date(previousSnapshot.snapshotAt).toLocaleDateString()})`
    : undefined;

  return (
    <div className="space-y-8">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <TwinVerificationBadge
          verified={twin.blockchainVerified}
          hederaTransactionId={twin.hederaTransactionId}
        />
        <div className="flex items-center gap-4">
          <span className="text-sm text-text-secondary">
            {twin.transactionCount} transactions &middot; {twin.analysisMonths} months
          </span>
          <Button
            variant="secondary"
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
            className="flex items-center gap-2 text-sm"
          >
            <RefreshCw className={`h-4 w-4 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
            {refreshMutation.isPending ? 'Refreshing...' : 'Refresh Twin'}
          </Button>
          <TwinPDFExport />
        </div>
      </div>

      {refreshMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-primary/10 border border-primary/30 px-4 py-3 text-sm text-primary"
        >
          {refreshMsg}
        </motion.div>
      )}

      {/* Score + Radar side-by-side on desktop */}
      <div className="grid lg:grid-cols-3 gap-6">
        <TwinScoreCard score={twin.overallScore} />
        <div className="lg:col-span-2">
          <TwinRadarChart
            dimensions={dimensions}
            ghostDimensions={ghostDimensions}
            ghostLabel={ghostLabel}
          />
        </div>
      </div>

      {/* Individual dimension cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {dimensions.map((d, i) => {
          const prev = previousSnapshot ? (previousSnapshot as Record<string, unknown>)[d.key] as number : null;
          const delta = prev != null ? d.score - prev : null;

          return (
            <motion.div
              key={d.key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i, duration: 0.4 }}
            >
              <Card className="h-full">
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: RADAR_COLORS[d.key] ?? '#94A3B8' }}
                  />
                  <span className="text-sm font-medium text-text-secondary">{d.label}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold">{Math.round(d.score)}</p>
                  {delta != null && delta !== 0 && (
                    <span className={`text-sm font-medium ${delta > 0 ? 'text-success' : 'text-danger'}`}>
                      {delta > 0 ? '+' : ''}{Math.round(delta)}
                    </span>
                  )}
                </div>
                <ScoreMeter score={d.score} showLabel={false} className="mt-3" />
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Pillar Explainability */}
      <PillarExplainability />

      {/* Lending readiness */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <Card>
          <h3 className="text-lg font-semibold mb-4">Lending readiness</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {LOAN_TYPES.map((lt) => {
              const score = twin[lt.key] as number;
              return (
                <div key={lt.key}>
                  <p className="text-sm font-medium text-text-secondary mb-1">{lt.label}</p>
                  <p className="text-2xl font-bold">{Math.round(score)}</p>
                  <ScoreMeter score={score} showLabel={true} className="mt-2" />
                </div>
              );
            })}
          </div>
        </Card>
      </motion.div>

      {/* Timeline + Spending breakdown side by side */}
      <div className="grid lg:grid-cols-2 gap-6">
        <TwinTimeline transactions={twin.transactions} />
        <SpendingBreakdown transactions={twin.transactions} />
      </div>

      {/* Interactive Narrative */}
      <InteractiveNarrative
        narrative={twin.consumerNarrative}
        categories={categoryAggregates ?? []}
      />
    </div>
  );
}
