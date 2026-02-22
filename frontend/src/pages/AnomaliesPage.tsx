import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { ScoreMeter } from '../components/ui/ScoreMeter';
import { Spinner } from '../components/ui/Spinner';
import { insightsService } from '../services/insightsService';
import type { Anomaly } from '../services/insightsService';
import {
  AlertTriangle, TrendingUp, CreditCard, Activity,
  ChevronDown, Lightbulb, Brain, ShieldCheck,
  ArrowDownCircle, BarChart3, Wallet, RefreshCw,
} from 'lucide-react';

const SEVERITY_CONFIG = {
  alert: { bg: 'bg-danger/10', border: 'border-danger/30', icon: AlertTriangle, iconColor: 'text-danger', badge: 'bg-danger/20 text-danger' },
  warning: { bg: 'bg-warning/10', border: 'border-warning/30', icon: AlertTriangle, iconColor: 'text-warning', badge: 'bg-warning/20 text-warning' },
  info: { bg: 'bg-primary/10', border: 'border-primary/30', icon: Activity, iconColor: 'text-primary', badge: 'bg-primary/20 text-primary' },
};

const TYPE_ICONS: Record<string, typeof AlertTriangle> = {
  lifestyle_creep: TrendingUp,
  subscription_bloat: CreditCard,
  income_volatility: BarChart3,
  spending_spike: ArrowDownCircle,
  savings_decline: Wallet,
  recurring_increase: RefreshCw,
  discretionary_surge: TrendingUp,
  balance_erosion: ArrowDownCircle,
};

export function AnomaliesPage() {
  const { data: report, isLoading, error } = useQuery({
    queryKey: ['anomalies'],
    queryFn: insightsService.getAnomalies,
  });

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAiInsights, setShowAiInsights] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Spinner />
        <p className="text-text-secondary text-sm">Analyzing your financial patterns...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <PageWrapper title="Anomaly Detection">
        <Card className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-4" />
          <p className="text-text-secondary">Could not load anomaly report. Make sure your Financial Twin exists.</p>
        </Card>
      </PageWrapper>
    );
  }

  const alerts = report.anomalies.filter((a) => a.severity === 'alert');
  const warnings = report.anomalies.filter((a) => a.severity === 'warning');
  const infos = report.anomalies.filter((a) => a.severity === 'info');

  return (
    <PageWrapper title="Anomaly Detection">
      <p className="text-text-secondary mb-8 max-w-2xl">
        Your Financial Twin automatically flags patterns like Lifestyle Creep, Subscription Bloat,
        and spending anomalies — turning your narrative into actionable advice.
      </p>

      {/* Health Score Banner */}
      <Card className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-6">
          <div>
            <p className="text-sm text-text-secondary mb-1">Financial Health Score</p>
            <p className="text-4xl font-bold">{report.healthScore}/100</p>
            <p className="text-sm text-text-secondary mt-2 max-w-md">{report.summary}</p>
          </div>
          <div className="w-32">
            <ScoreMeter score={report.healthScore} showLabel />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-4">
          {alerts.length > 0 && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-danger/20 text-danger text-sm font-medium">
              <AlertTriangle className="h-3.5 w-3.5" /> {alerts.length} Alert{alerts.length > 1 ? 's' : ''}
            </span>
          )}
          {warnings.length > 0 && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-warning/20 text-warning text-sm font-medium">
              <AlertTriangle className="h-3.5 w-3.5" /> {warnings.length} Warning{warnings.length > 1 ? 's' : ''}
            </span>
          )}
          {infos.length > 0 && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-primary/20 text-primary text-sm font-medium">
              <Activity className="h-3.5 w-3.5" /> {infos.length} Insight{infos.length > 1 ? 's' : ''}
            </span>
          )}
          {report.anomalies.length === 0 && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-success/20 text-success text-sm font-medium">
              <ShieldCheck className="h-3.5 w-3.5" /> All Clear
            </span>
          )}
        </div>
      </Card>

      {/* Anomaly Cards */}
      {report.anomalies.length === 0 ? (
        <Card className="text-center py-12">
          <ShieldCheck className="h-12 w-12 text-success mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No anomalies detected</h3>
          <p className="text-text-secondary text-sm">Your financial patterns look healthy and consistent. Keep it up!</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {report.anomalies.map((anomaly, i) => (
            <AnomalyCard
              key={`${anomaly.type}-${i}`}
              anomaly={anomaly}
              index={i}
              isExpanded={expandedId === `${anomaly.type}-${i}`}
              onToggle={() => setExpandedId(expandedId === `${anomaly.type}-${i}` ? null : `${anomaly.type}-${i}`)}
            />
          ))}
        </div>
      )}

      {/* AI Insights */}
      {report.aiInsights && (
        <Card className="mt-8">
          <button
            onClick={() => setShowAiInsights(!showAiInsights)}
            className="w-full flex items-center justify-between"
          >
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              AI-Powered Insights
            </h3>
            <ChevronDown className={`h-5 w-5 text-text-secondary transition-transform ${showAiInsights ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {showAiInsights && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">
                  {report.aiInsights}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      )}
    </PageWrapper>
  );
}

function AnomalyCard({
  anomaly,
  index,
  isExpanded,
  onToggle,
}: {
  anomaly: Anomaly;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const config = SEVERITY_CONFIG[anomaly.severity];
  const Icon = TYPE_ICONS[anomaly.type] ?? config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className={`${config.bg} ${config.border} border`}>
        <button onClick={onToggle} className="w-full text-left">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${config.iconColor}`} />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold">{anomaly.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${config.badge}`}>
                    {anomaly.severity}
                  </span>
                </div>
                <p className="text-sm text-text-secondary mt-1">{anomaly.description}</p>
              </div>
            </div>
            <ChevronDown className={`h-5 w-5 text-text-secondary shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </div>
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 pt-4 border-t border-slate-700/30 space-y-3">
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-text-secondary text-xs">Metric</p>
                    <p className="font-medium">{anomaly.metric}</p>
                  </div>
                  <div>
                    <p className="text-text-secondary text-xs">Current Value</p>
                    <p className="font-medium">{anomaly.currentValue}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-text-secondary text-xs">Trend</p>
                    <p className="font-medium">{anomaly.trend}</p>
                  </div>
                </div>

                <div className="bg-bg-elevated/50 rounded-xl p-3 border border-slate-700/30">
                  <p className="text-xs text-text-secondary flex items-center gap-1 mb-1">
                    <Lightbulb className="h-3 w-3" /> What to do
                  </p>
                  <p className="text-sm">{anomaly.actionableAdvice}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}
