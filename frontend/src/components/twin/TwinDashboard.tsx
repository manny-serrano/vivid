import { motion } from 'framer-motion';
import { TwinRadarChart } from './TwinRadarChart';
import { TwinScoreCard } from './TwinScoreCard';
import { TwinTimeline } from './TwinTimeline';
import { TwinNarrative } from './TwinNarrative';
import { TwinVerificationBadge } from './TwinVerificationBadge';
import { TwinPDFExport } from './TwinPDFExport';
import { ScoreMeter } from '../ui/ScoreMeter';
import { Card } from '../ui/Card';
import type { TwinProfile } from '../../services/twinService';
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
  const dimensions = DIMENSIONS.map((d) => ({
    key: d.key,
    label: d.label,
    score: twin[d.key] as number,
  }));

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
          <TwinPDFExport />
        </div>
      </div>

      {/* Score + Radar side-by-side on desktop */}
      <div className="grid lg:grid-cols-3 gap-6">
        <TwinScoreCard score={twin.overallScore} />
        <div className="lg:col-span-2">
          <TwinRadarChart dimensions={dimensions} />
        </div>
      </div>

      {/* Individual dimension cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {dimensions.map((d, i) => (
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
              <p className="text-3xl font-bold">{Math.round(d.score)}</p>
              <ScoreMeter score={d.score} showLabel={false} className="mt-3" />
            </Card>
          </motion.div>
        ))}
      </div>

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

      {/* Timeline */}
      <TwinTimeline />

      {/* Narrative */}
      <TwinNarrative narrative={twin.consumerNarrative} />
    </div>
  );
}
