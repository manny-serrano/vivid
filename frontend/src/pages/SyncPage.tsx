import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { syncService } from '../services/syncService';
import type { SyncDashboard, SyncLogEntry } from '../services/syncService';
import {
  RefreshCw, Activity, CheckCircle2, XCircle, Clock, Database,
  Wifi, WifiOff, AlertTriangle, ArrowDownToLine, Zap, BarChart3,
} from 'lucide-react';

const HEALTH_STYLES: Record<string, { color: string; bg: string; label: string; icon: typeof Wifi }> = {
  healthy: { color: 'text-emerald-400', bg: 'bg-emerald-400/10', label: 'Healthy', icon: Wifi },
  degraded: { color: 'text-amber-400', bg: 'bg-amber-400/10', label: 'Degraded', icon: AlertTriangle },
  offline: { color: 'text-slate-400', bg: 'bg-slate-400/10', label: 'Offline', icon: WifiOff },
};

const STATUS_STYLES: Record<string, { dot: string; label: string }> = {
  RECEIVED: { dot: 'bg-blue-400', label: 'Received' },
  PROCESSING: { dot: 'bg-amber-400 animate-pulse', label: 'Processing' },
  COMPLETED: { dot: 'bg-emerald-400', label: 'Completed' },
  FAILED: { dot: 'bg-red-400', label: 'Failed' },
};

function HealthBadge({ health }: { health: string }) {
  const style = HEALTH_STYLES[health] ?? HEALTH_STYLES.offline;
  const Icon = style.icon;
  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium ${style.color} ${style.bg}`}>
      <Icon className="w-3.5 h-3.5" />
      {style.label}
    </div>
  );
}

function SyncLogRow({ log }: { log: SyncLogEntry }) {
  const status = STATUS_STYLES[log.status] ?? STATUS_STYLES.RECEIVED;
  const time = new Date(log.createdAt);
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 py-2.5 border-b border-slate-700/30 last:border-0"
    >
      <div className={`w-2 h-2 rounded-full shrink-0 ${status.dot}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">{log.webhookCode.replace(/_/g, ' ')}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
            log.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' :
            log.status === 'FAILED' ? 'bg-red-500/10 text-red-400' :
            'bg-slate-700/50 text-text-secondary'
          }`}>
            {status.label}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-text-secondary mt-0.5">
          {log.newCount > 0 && <span className="flex items-center gap-0.5"><ArrowDownToLine className="w-2.5 h-2.5" /> +{log.newCount} txns</span>}
          {log.removedCount > 0 && <span className="text-red-400">-{log.removedCount} removed</span>}
          {log.errorMessage && <span className="text-red-400 truncate max-w-[200px]">{log.errorMessage}</span>}
        </div>
      </div>
      <span className="text-[10px] text-text-secondary shrink-0">
        {time.toLocaleDateString()} {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </motion.div>
  );
}

function PipelineDiagram() {
  const steps = [
    { label: 'Plaid Webhook', icon: Zap, desc: 'Real-time event' },
    { label: 'Sync Engine', icon: RefreshCw, desc: 'Validate & log' },
    { label: 'Transaction Fetch', icon: ArrowDownToLine, desc: 'Pull new data' },
    { label: 'AI Pipeline', icon: Activity, desc: 'Score & analyze' },
    { label: 'Twin Update', icon: Database, desc: 'Persist results' },
  ];

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-primary" /> Continuous Sync Pipeline
      </h3>
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center gap-1">
            <div className="flex flex-col items-center text-center min-w-[80px]">
              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-1">
                <step.icon className="w-4 h-4 text-primary" />
              </div>
              <span className="text-[10px] font-medium">{step.label}</span>
              <span className="text-[9px] text-text-secondary">{step.desc}</span>
            </div>
            {i < steps.length - 1 && (
              <div className="w-6 h-px bg-gradient-to-r from-primary/40 to-primary/10 shrink-0 mt-[-16px]" />
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

export function SyncPage() {
  const qc = useQueryClient();
  const [syncMsg, setSyncMsg] = useState('');

  const { data: dashboard, isLoading } = useQuery<SyncDashboard>({
    queryKey: ['sync-dashboard'],
    queryFn: syncService.getDashboard,
  });

  const triggerMut = useMutation({
    mutationFn: syncService.triggerSync,
    onSuccess: (data) => {
      setSyncMsg(data.message);
      qc.invalidateQueries({ queryKey: ['sync-dashboard'] });
      setTimeout(() => setSyncMsg(''), 5000);
    },
    onError: () => setSyncMsg('Sync request failed'),
  });

  const fmt = (iso: string | null) => {
    if (!iso) return 'Never';
    const d = new Date(iso);
    return `${d.toLocaleDateString()} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <RefreshCw className="w-7 h-7 text-primary" /> Plaid Continuous Sync
              </h1>
              <p className="text-text-secondary text-sm mt-1">
                Real-time transaction pipeline — your Financial Twin stays fresh automatically.
              </p>
            </div>
            <button
              onClick={() => triggerMut.mutate()}
              disabled={triggerMut.isPending}
              className="px-4 py-2 text-sm bg-primary text-white rounded-xl hover:bg-primary/90 flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${triggerMut.isPending ? 'animate-spin' : ''}`} />
              {triggerMut.isPending ? 'Syncing...' : 'Manual Sync'}
            </button>
          </div>
        </motion.div>

        {syncMsg && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
            className="px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/30 text-sm text-primary"
          >
            {syncMsg}
          </motion.div>
        )}

        {isLoading && <Spinner className="mx-auto mt-16" />}

        {dashboard && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: 'Health', value: <HealthBadge health={dashboard.syncHealth} />, raw: true },
                { label: 'Total Syncs', value: dashboard.totalSyncs, icon: RefreshCw, color: 'text-primary' },
                { label: 'Successful', value: dashboard.successfulSyncs, icon: CheckCircle2, color: 'text-emerald-400' },
                { label: 'Failed', value: dashboard.failedSyncs, icon: XCircle, color: 'text-red-400' },
                { label: 'Transactions', value: dashboard.transactionsIngested.toLocaleString(), icon: Database, color: 'text-cyan-400' },
              ].map((item) => (
                <Card key={item.label} className="p-3">
                  {'raw' in item && item.raw ? (
                    <div>
                      <p className="text-xs text-text-secondary mb-1">{item.label}</p>
                      {item.value}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {item.icon && <item.icon className={`w-4 h-4 ${item.color}`} />}
                      <div>
                        <p className="text-lg font-bold">{item.value}</p>
                        <p className="text-[10px] text-text-secondary">{item.label}</p>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <Card className="p-4">
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-text-secondary" /> Timeline
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-text-secondary">Last Sync</span><span>{fmt(dashboard.lastSyncAt)}</span></div>
                  <div className="flex justify-between"><span className="text-text-secondary">Next Expected</span><span>{fmt(dashboard.nextExpectedSync)}</span></div>
                </div>
              </Card>
              <PipelineDiagram />
            </div>

            {/* Sync Log */}
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" /> Sync Log
              </h3>
              {dashboard.recentLogs.length === 0 ? (
                <p className="text-xs text-text-secondary text-center py-8">
                  No sync events yet. Connect Plaid to start receiving real-time transaction updates.
                </p>
              ) : (
                <div className="max-h-[400px] overflow-y-auto">
                  {dashboard.recentLogs.map((log) => <SyncLogRow key={log.id} log={log} />)}
                </div>
              )}
            </Card>

            {/* How it works */}
            <Card className="p-5">
              <h3 className="text-sm font-semibold mb-3">How Continuous Sync Works</h3>
              <div className="grid md:grid-cols-3 gap-4 text-xs text-text-secondary">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center mb-2">
                    <Zap className="w-4 h-4 text-violet-400" />
                  </div>
                  <p className="font-medium text-text-primary mb-1">Webhook Events</p>
                  <p>Plaid sends real-time webhooks when new transactions post, get updated, or are removed from your linked accounts.</p>
                </div>
                <div>
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                  </div>
                  <p className="font-medium text-text-primary mb-1">Auto-Regeneration</p>
                  <p>Each webhook triggers a full pipeline run — re-fetching transactions, re-scoring, and updating your Financial Twin automatically.</p>
                </div>
                <div>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-2">
                    <Database className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="font-medium text-text-primary mb-1">Always Fresh</p>
                  <p>Your twin scores, narratives, red flags, and lending readiness update continuously — no manual refresh needed.</p>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>
    </PageWrapper>
  );
}
