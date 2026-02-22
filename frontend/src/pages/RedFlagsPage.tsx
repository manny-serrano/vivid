import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { redFlagsService } from '../services/redFlagsService';
import type { RedFlag, FixTimeline, FlagSeverity } from '../services/redFlagsService';
import {
  AlertTriangle, ChevronDown, Eye, Clock,
  CheckCircle2, ArrowRight, ShieldAlert,
} from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';

const SEVERITY_STYLES: Record<FlagSeverity, {
  bg: string; border: string; text: string; dot: string; label: string; icon: string;
}> = {
  red: { bg: 'bg-danger/5', border: 'border-danger/30', text: 'text-danger', dot: 'bg-danger', label: 'Critical', icon: '🔴' },
  yellow: { bg: 'bg-warning/5', border: 'border-warning/30', text: 'text-warning', dot: 'bg-warning', label: 'Warning', icon: '🟡' },
  green: { bg: 'bg-success/5', border: 'border-success/30', text: 'text-success', dot: 'bg-success', label: 'Minor', icon: '🟢' },
};

const PERIOD_COLORS: Record<string, string> = {
  '30 days': 'bg-danger/10 text-danger border-danger/20',
  '3 months': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  '6 months': 'bg-warning/10 text-warning border-warning/20',
  '9 months': 'bg-primary/10 text-primary border-primary/20',
  '1 year': 'bg-success/10 text-success border-success/20',
};

function FixTimelineCard({ fix }: { fix: FixTimeline }) {
  const colors = PERIOD_COLORS[fix.period] ?? 'bg-bg-elevated text-text-secondary border-slate-700';
  return (
    <div className="flex gap-3 items-start">
      <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-lg border ${colors}`}>
        {fix.period}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm">{fix.action}</p>
        <p className="text-xs text-text-secondary mt-0.5 flex items-center gap-1">
          <ArrowRight className="h-3 w-3 shrink-0" />
          {fix.impact}
        </p>
      </div>
    </div>
  );
}

function RedFlagCard({ flag, index }: { flag: RedFlag; index: number }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const style = SEVERITY_STYLES[flag.severity];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
    >
      <div className={`rounded-2xl border overflow-hidden ${style.bg} ${style.border}`}>
        {/* Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left p-5"
        >
          <div className="flex items-start gap-4">
            <span className="text-2xl shrink-0 mt-0.5">{style.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-base leading-tight">{flag.title}</p>
              <p className="text-sm text-text-secondary mt-1.5 leading-relaxed">{flag.detail}</p>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${style.bg} ${style.text} border ${style.border}`}>
                  {style.label}
                </span>
                <span className="text-xs text-text-secondary font-mono">{flag.metric}</span>
              </div>
            </div>
            <ChevronDown className={`h-5 w-5 text-text-secondary shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {/* Expanded content */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 space-y-5">
                {/* Lender perspective */}
                <div className="bg-bg-surface/80 rounded-xl p-4 border border-slate-700/50">
                  <p className="text-xs font-semibold text-text-secondary mb-1 flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {t('redFlags.lenderView')}
                  </p>
                  <p className="text-sm leading-relaxed">{flag.lenderPerspective}</p>
                </div>

                {/* Fix timeline */}
                <div>
                  <p className="text-xs font-semibold text-text-secondary mb-3 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {t('redFlags.howToFix')}
                  </p>
                  <div className="space-y-3">
                    {flag.fixes.map((fix, i) => (
                      <FixTimelineCard key={i} fix={fix} />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export function RedFlagsPage() {
  const { t } = useTranslation();
  const { data: report, isLoading, error } = useQuery({
    queryKey: ['red-flags'],
    queryFn: redFlagsService.getReport,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Spinner />
        <p className="text-text-secondary text-sm">{t('redFlags.analyzing')}</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <PageWrapper title={t('redFlags.title')}>
        <Card className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-4" />
          <p className="text-text-secondary">{t('common.error')}</p>
        </Card>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title={t('redFlags.title')}>
      <p className="text-text-secondary mb-8 max-w-2xl text-sm">
        {t('redFlags.subtitle')}
      </p>

      {/* Summary banner */}
      {report.flags.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-6 rounded-2xl border mb-8 ${
            report.redCount >= 3 ? 'bg-danger/5 border-danger/30'
              : report.redCount >= 1 ? 'bg-warning/5 border-warning/30'
              : 'bg-primary/5 border-primary/30'
          }`}
        >
          <div className="flex items-start gap-4">
            <ShieldAlert className={`h-8 w-8 shrink-0 ${
              report.redCount >= 3 ? 'text-danger'
                : report.redCount >= 1 ? 'text-warning'
                : 'text-primary'
            }`} />
            <div>
              <p className="text-xl font-bold">
                {report.summary}
              </p>
              <div className="flex items-center gap-4 mt-2 flex-wrap">
                {report.redCount > 0 && (
                  <span className="flex items-center gap-1.5 text-sm">
                    <span className="h-2.5 w-2.5 rounded-full bg-danger" />
                    <span className="font-semibold text-danger">{report.redCount} {t('redFlags.critical').toLowerCase()}</span>
                  </span>
                )}
                {report.yellowCount > 0 && (
                  <span className="flex items-center gap-1.5 text-sm">
                    <span className="h-2.5 w-2.5 rounded-full bg-warning" />
                    <span className="font-semibold text-warning">{report.yellowCount} {t('redFlags.warning').toLowerCase()}</span>
                  </span>
                )}
                {report.greenCount > 0 && (
                  <span className="flex items-center gap-1.5 text-sm">
                    <span className="h-2.5 w-2.5 rounded-full bg-success" />
                    <span className="font-semibold text-success">{report.greenCount} {t('redFlags.minor').toLowerCase()}</span>
                  </span>
                )}
              </div>
              <p className="text-sm text-text-secondary mt-3 leading-relaxed max-w-xl">
                {report.loanReadinessVerdict}
              </p>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl border bg-success/5 border-success/30 mb-8"
        >
          <div className="flex items-center gap-4">
            <CheckCircle2 className="h-8 w-8 text-success shrink-0" />
            <div>
              <p className="text-xl font-bold">{t('redFlags.noFlags')}</p>
              <p className="text-sm text-text-secondary mt-1">{report.loanReadinessVerdict}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Flags list */}
      <div className="space-y-4">
        {report.flags.map((flag, i) => (
          <RedFlagCard key={flag.id} flag={flag} index={i} />
        ))}
      </div>
    </PageWrapper>
  );
}
