import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { optimizerService } from '../services/optimizerService';
import type { DocumentDraft, RiskLevel } from '../services/optimizerService';
import {
  Shield, AlertTriangle, TrendingDown, TrendingUp,
  FileText, Copy, Download, ChevronDown, Brain,
  Clock, BadgeCheck, Minus,
} from 'lucide-react';

const RISK_STYLES: Record<RiskLevel, { bg: string; border: string; text: string; label: string }> = {
  low: { bg: 'bg-success/10', border: 'border-success/30', text: 'text-success', label: 'Low Risk' },
  moderate: { bg: 'bg-primary/10', border: 'border-primary/30', text: 'text-primary', label: 'Moderate Risk' },
  elevated: { bg: 'bg-warning/10', border: 'border-warning/30', text: 'text-warning', label: 'Elevated Risk' },
  high: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', label: 'High Risk' },
  critical: { bg: 'bg-danger/10', border: 'border-danger/30', text: 'text-danger', label: 'Critical Risk' },
};

const ALERT_ICONS: Record<string, typeof AlertTriangle> = {
  low: BadgeCheck,
  moderate: AlertTriangle,
  elevated: AlertTriangle,
  high: AlertTriangle,
  critical: AlertTriangle,
};

export function LoanShieldPage() {
  const { data: report, isLoading, error } = useQuery({
    queryKey: ['loan-shield'],
    queryFn: optimizerService.getLoanShield,
  });

  const [selectedDoc, setSelectedDoc] = useState<DocumentDraft | null>(null);
  const [showAi, setShowAi] = useState(false);
  const [expandedAlert, setExpandedAlert] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Spinner />
        <p className="text-text-secondary text-sm">Running Loan Shield analysis...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <PageWrapper title="Student Loan Shield">
        <Card className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-4" />
          <p className="text-text-secondary">Could not run shield analysis. Make sure your Financial Twin exists.</p>
        </Card>
      </PageWrapper>
    );
  }

  const risk = RISK_STYLES[report.riskLevel];
  const income = report.incomeAnalysis;
  const debt = report.debtAnalysis;

  const trendIcon = income.incomeTrend === 'growing'
    ? <TrendingUp className="h-4 w-4 text-success" />
    : income.incomeTrend === 'declining'
    ? <TrendingDown className="h-4 w-4 text-danger" />
    : income.incomeTrend === 'volatile'
    ? <AlertTriangle className="h-4 w-4 text-warning" />
    : <Minus className="h-4 w-4 text-text-secondary" />;

  return (
    <PageWrapper title="Student Loan Shield">
      <p className="text-text-secondary mb-8 max-w-2xl">
        Your AI agent monitors your income via Plaid and detects when you're at risk of
        missing loan payments. If risk is detected, it auto-drafts IDR and deferment
        paperwork with Hedera-stamped digital signatures.
      </p>

      {/* Risk Banner */}
      <div className={`p-6 rounded-2xl border mb-8 ${risk.bg} ${risk.border}`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Shield className={`h-6 w-6 ${risk.text}`} />
              <span className={`text-lg font-bold ${risk.text}`}>{risk.label}</span>
            </div>
            <p className="text-text-secondary text-sm mt-1 max-w-lg">
              {report.riskLevel === 'low'
                ? 'Your income and debt levels look healthy. The Shield is monitoring and will alert you if things change.'
                : report.riskLevel === 'critical'
                ? 'Immediate action recommended. Your income decline puts you at high risk of default.'
                : 'Income changes detected that may affect your ability to make loan payments on time.'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-text-secondary mb-1">Runway Without Income</p>
            <p className="text-3xl font-bold flex items-center gap-1">
              <Clock className="h-6 w-6" />
              {report.runwayWithoutIncome} mo
            </p>
          </div>
        </div>
      </div>

      {/* Financial Overview */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <p className="text-xs text-text-secondary mb-1">Avg Monthly Income</p>
          <p className="text-2xl font-bold">${income.averageMonthlyIncome.toLocaleString()}</p>
        </Card>
        <Card>
          <p className="text-xs text-text-secondary mb-1">Recent Income (3-mo)</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold">${income.recentMonthlyIncome.toLocaleString()}</p>
            {trendIcon}
          </div>
          {income.incomeDropPercent > 0 && (
            <p className="text-xs text-danger mt-1">-{income.incomeDropPercent}% from average</p>
          )}
        </Card>
        <Card>
          <p className="text-xs text-text-secondary mb-1">Debt-to-Income Ratio</p>
          <p className={`text-2xl font-bold ${debt.debtToIncomeRatio > 0.35 ? 'text-danger' : ''}`}>
            {(debt.debtToIncomeRatio * 100).toFixed(1)}%
          </p>
          <p className="text-xs text-text-secondary mt-1">Target: &lt;35%</p>
        </Card>
        <Card>
          <p className="text-xs text-text-secondary mb-1">Est. Student Loan Payment</p>
          <p className="text-2xl font-bold">
            {debt.estimatedStudentLoanPayment > 0 ? `$${debt.estimatedStudentLoanPayment}` : 'N/A'}
          </p>
          <p className="text-xs text-text-secondary mt-1">/month</p>
        </Card>
      </div>

      {/* Alerts */}
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-warning" />
        Shield Alerts
      </h2>
      <div className="space-y-3 mb-8">
        {report.alerts.map((alert, i) => {
          const alertStyle = RISK_STYLES[alert.riskLevel];
          const Icon = ALERT_ICONS[alert.riskLevel];
          const isExpanded = expandedAlert === i;

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className={`border ${alertStyle.border}`}>
                <button onClick={() => setExpandedAlert(isExpanded ? null : i)} className="w-full text-left">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${alertStyle.text}`} />
                      <div>
                        <p className="font-semibold">{alert.title}</p>
                        <p className="text-sm text-text-secondary mt-1">{alert.description}</p>
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
                      <div className="mt-3 pt-3 border-t border-slate-700/30 bg-bg-elevated/50 rounded-xl p-3 text-sm">
                        <p className="text-text-secondary text-xs mb-1 font-medium">Recommendation</p>
                        <p>{alert.recommendation}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Documents — Sign & Send */}
      {report.documents.length > 0 && (
        <>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Ready-to-Sign Documents
          </h2>
          <div className="space-y-3 mb-8">
            {report.documents.map((doc, i) => (
              <motion.div
                key={doc.type}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="border border-primary/20">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        {doc.title}
                      </p>
                      <p className="text-sm text-text-secondary mt-1">{doc.description}</p>
                      {doc.hederaTransactionId && (
                        <p className="text-xs text-text-secondary mt-1 flex items-center gap-1">
                          <BadgeCheck className="h-3 w-3 text-success" />
                          Hedera-stamped: <code className="text-[10px]">{doc.hederaTransactionId}</code>
                        </p>
                      )}
                      {doc.hederaHash && !doc.hederaTransactionId && (
                        <p className="text-xs text-text-secondary mt-1 flex items-center gap-1">
                          <BadgeCheck className="h-3 w-3 text-primary" />
                          Document hash: <code className="text-[10px]">{doc.hederaHash.slice(0, 16)}...</code>
                        </p>
                      )}
                    </div>
                    <Button
                      onClick={() => setSelectedDoc(doc)}
                      className="shrink-0"
                    >
                      Review & Sign
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </>
      )}

      {/* AI Insight */}
      {report.aiInsight && (
        <Card>
          <button onClick={() => setShowAi(!showAi)} className="w-full flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              AI Shield Analysis
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
                  {report.aiInsight}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      )}

      {/* Document Review Modal */}
      <Modal
        isOpen={!!selectedDoc}
        onClose={() => setSelectedDoc(null)}
        title={selectedDoc?.title ?? ''}
      >
        {selectedDoc && (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">{selectedDoc.description}</p>

            <pre className="text-xs whitespace-pre-wrap bg-bg-elevated rounded-xl p-4 border border-slate-700 max-h-64 overflow-y-auto font-mono leading-relaxed">
              {selectedDoc.content}
            </pre>

            {selectedDoc.hederaHash && (
              <div className="text-xs text-text-secondary flex items-center gap-1 bg-bg-elevated rounded-xl px-3 py-2 border border-slate-700">
                <BadgeCheck className="h-3.5 w-3.5 text-success shrink-0" />
                <span>Cryptographic hash recorded on Hedera for tamper-proof verification</span>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={() => navigator.clipboard.writeText(selectedDoc.content)}
                className="flex-1 flex items-center justify-center gap-2"
              >
                <Copy className="h-4 w-4" /> Copy Document
              </Button>
              <Button
                onClick={() => {
                  const blob = new Blob([selectedDoc.content], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${selectedDoc.type}_${new Date().toISOString().slice(0, 10)}.txt`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="flex-1 flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" /> Download
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </PageWrapper>
  );
}
