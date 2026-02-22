import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { useTranslation } from '../i18n/useTranslation';
import { optimizerService } from '../services/optimizerService';
import type { CancelAction } from '../services/optimizerService';
import {
  Scissors, DollarSign, Mail, ExternalLink, Phone,
  AlertTriangle, ChevronDown, Brain, Copy, XCircle,
} from 'lucide-react';

const DIFFICULTY_STYLES = {
  easy: { bg: 'bg-success/10', text: 'text-success', label: 'Easy' },
  medium: { bg: 'bg-warning/10', text: 'text-warning', label: 'Medium' },
  hard: { bg: 'bg-danger/10', text: 'text-danger', label: 'Hard' },
};

export function OptimizePage() {
  const { t } = useTranslation();
  const { data: report, isLoading, error } = useQuery({
    queryKey: ['optimize-spend'],
    queryFn: optimizerService.getSubscriptions,
  });

  const [selectedAction, setSelectedAction] = useState<CancelAction | null>(null);
  const [showAi, setShowAi] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Spinner />
        <p className="text-text-secondary text-sm">Analyzing your spending...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <PageWrapper title={t('optimize.title')}>
        <Card className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-4" />
          <p className="text-text-secondary">Could not analyze spending. Make sure your Financial Twin exists.</p>
        </Card>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title={t('optimize.title')}>
      <p className="text-text-secondary mb-8 max-w-2xl">
        Your AI agent analyzed your Plaid data to find unnecessary charges — fast food, delivery apps,
        entertainment, and other spending that isn't needed to survive. Take action in minutes.
      </p>

      {/* Savings Banner */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <Card className="text-center">
          <p className="text-xs text-text-secondary mb-1">Total Monthly Spending</p>
          <p className="text-3xl font-bold">${report.totalMonthlySpending.toLocaleString()}</p>
          <p className="text-xs text-text-secondary">{report.allCharges.length} merchants tracked</p>
        </Card>
        <Card className="text-center bg-danger/5 border border-danger/20">
          <p className="text-xs text-text-secondary mb-1">Unnecessary Spending</p>
          <p className="text-3xl font-bold text-danger">${report.potentialMonthlySavings.toLocaleString()}/mo</p>
          <p className="text-xs text-text-secondary">{report.unnecessaryCharges.length} unnecessary charges</p>
        </Card>
        <Card className="text-center bg-success/5 border border-success/20">
          <p className="text-xs text-text-secondary mb-1">Potential Annual Savings</p>
          <p className="text-3xl font-bold text-success">${report.potentialAnnualSavings.toLocaleString()}</p>
          <p className="text-xs text-text-secondary">if you cut unnecessary spending</p>
        </Card>
      </div>

      {/* Unnecessary Charges */}
      {report.unnecessaryCharges.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <XCircle className="h-5 w-5 text-danger" />
            Unnecessary Spending — Cut These
          </h2>
          <div className="space-y-3">
            {report.unnecessaryCharges.map((charge, i) => {
              const matchingAction = report.cancelActions.find((a) => a.merchantName === charge.merchantName);
              return (
                <motion.div
                  key={`${charge.merchantName}-${i}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card className="border border-danger/20">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold">{charge.merchantName}</p>
                          <Badge variant="danger">Unnecessary</Badge>
                        </div>
                        <p className="text-sm text-text-secondary mt-1">
                          ${charge.monthlyAmount}/mo · ${charge.totalSpent} total spent
                        </p>
                        {charge.unnecessaryReason && (
                          <p className="text-xs text-text-secondary mt-0.5">{charge.unnecessaryReason}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {matchingAction?.cancelUrl && (
                          <a
                            href={matchingAction.cancelUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-danger/10 text-danger text-sm font-medium hover:bg-danger/20 transition-colors"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Cancel Now
                          </a>
                        )}
                        {matchingAction?.draftEmail && (
                          <button
                            onClick={() => setSelectedAction(matchingAction)}
                            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
                          >
                            <Mail className="h-3.5 w-3.5" />
                            Draft Email
                          </button>
                        )}
                        {matchingAction?.phoneNumber && (
                          <a
                            href={`tel:${matchingAction.phoneNumber}`}
                            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-warning/10 text-warning text-sm font-medium hover:bg-warning/20 transition-colors"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            Call
                          </a>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* All Charges */}
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <DollarSign className="h-5 w-5 text-primary" />
        All Spending by Merchant
      </h2>
      <div className="space-y-2 mb-8">
        {report.allCharges.map((charge, i) => (
          <motion.div
            key={`${charge.merchantName}-${i}`}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            <div
              className={`flex items-center justify-between p-3 rounded-xl border ${
                charge.isUnnecessary ? 'bg-danger/5 border-danger/20' : 'bg-bg-elevated border-slate-700/50'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{charge.merchantName}</p>
                  {charge.isUnnecessary && <Badge variant="danger">Unnecessary</Badge>}
                </div>
                <p className="text-xs text-text-secondary">
                  {charge.frequency} charges · Since {new Date(charge.firstSeen).toLocaleDateString()}
                  · Total: ${charge.totalSpent.toLocaleString()}
                </p>
              </div>
              <p className="text-sm font-bold ml-3">${charge.monthlyAmount}/mo</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* AI Summary */}
      {report.aiSummary && (
        <Card>
          <button onClick={() => setShowAi(!showAi)} className="w-full flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              AI Optimization Summary
            </h3>
            <ChevronDown className={`h-5 w-5 text-text-secondary transition-transform ${showAi ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {showAi && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">
                  {report.aiSummary}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      )}

      {/* Cancel Email Modal */}
      <Modal
        isOpen={!!selectedAction}
        onClose={() => setSelectedAction(null)}
        title={`Cancel ${selectedAction?.merchantName ?? ''}`}
      >
        {selectedAction?.draftEmail && (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Copy this email and send it to {selectedAction.merchantName}'s support team:
            </p>
            <pre className="text-xs whitespace-pre-wrap bg-bg-elevated rounded-xl p-4 border border-slate-700 max-h-64 overflow-y-auto">
              {selectedAction.draftEmail}
            </pre>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(selectedAction!.draftEmail!);
                }}
                className="flex-1 flex items-center justify-center gap-2"
              >
                <Copy className="h-4 w-4" /> Copy Email
              </Button>
              {selectedAction.cancelUrl && (
                <a
                  href={selectedAction.cancelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button className="w-full flex items-center justify-center gap-2">
                    <ExternalLink className="h-4 w-4" /> Go to Cancel Page
                  </Button>
                </a>
              )}
            </div>
          </div>
        )}
      </Modal>
    </PageWrapper>
  );
}
